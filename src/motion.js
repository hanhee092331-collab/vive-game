import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs-core";
import * as poseDetection from "@tensorflow-models/pose-detection";

// 정책서 2장: 포즈 인식은 온디바이스(webgl backend)에서만 수행하고,
// 영상/좌표는 메모리에서만 쓰고 저장·전송하지 않는다.
const ARM_RAISE_SCORE_THRESHOLD = 0.5;

export class MotionController {
  constructor({ onSignal, onError } = {}) {
    this.onSignal = onSignal ?? (() => {});
    this.onError = onError ?? (() => {});
    this.video = null;
    this.stream = null;
    this.detector = null;
    this.rafId = null;
    this.running = false;
  }

  // 정책서 3장: 웹캠이 없거나 권한이 거부되면 탭 입력으로 동일한 신호를 낼 수 있어야 한다.
  triggerFallback() {
    this.onSignal({ source: "tap" });
  }

  async start(videoEl) {
    if (this.running) return;
    this.video = videoEl;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
    } catch (err) {
      this.onError(err);
      return;
    }

    this.video.srcObject = this.stream;
    await this.video.play();

    await tf.setBackend("webgl");
    await tf.ready();
    this.detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING },
    );

    this.running = true;
    this.loop();
  }

  loop = async () => {
    if (!this.running || !this.detector) return;

    const poses = await this.detector.estimatePoses(this.video, {
      flipHorizontal: true,
    });
    const pose = poses[0];

    if (pose) {
      const raised = isArmRaised(pose.keypoints);
      if (raised) this.onSignal({ source: "camera" });
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  // 정책서 2장: 세션 종료 시 스트림을 즉시 해제한다.
  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) this.video.srcObject = null;

    this.detector?.dispose?.();
    this.detector = null;
  }
}

function isArmRaised(keypoints) {
  const byName = Object.fromEntries(keypoints.map((k) => [k.name, k]));
  const shoulders = [byName.left_shoulder, byName.right_shoulder];
  const wrists = [byName.left_wrist, byName.right_wrist];

  return shoulders.some((shoulder, i) => {
    const wrist = wrists[i];
    if (!shoulder || !wrist) return false;
    if (shoulder.score < ARM_RAISE_SCORE_THRESHOLD) return false;
    if (wrist.score < ARM_RAISE_SCORE_THRESHOLD) return false;
    return wrist.y < shoulder.y;
  });
}
