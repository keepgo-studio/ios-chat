/**
 * @see https://easings.net
 */
const Ease = {
  easeOutQuint: (x: number) => (1 - Math.pow(1 - x, 5)),
  easeInOutQuad: (x: number) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2,
}

type EaseKey = keyof typeof Ease;
type MoveCallback = (t: number) => void;
type MoveParams = {
  from: number;
  dest: number;
  duration: number;
}

export function easeTo(
  callback: MoveCallback,
  params: MoveParams,
  ease: keyof typeof Ease = "easeOutQuint",
) {
  const { from, dest, duration } = params;
  let lifeCycle = true;
  const validEase: EaseKey = ease in Ease ? ease : "easeOutQuint";

  const cancelMoving = () => {
    lifeCycle = false;
  };

  const start = Date.now();

  const run = async () => new Promise(res => {
    const scroll = () => {
      if (!lifeCycle) return;

      const currentTime = Date.now();
      const elapsed = (currentTime - start) / duration;
      const time = elapsed > 1 ? 1 : elapsed;
      const easedT = Ease[validEase](time);
      const t = easedT * (dest - from) + from;

      callback(t);
  
      if (time < 1) requestAnimationFrame(scroll);
      else res(true);
    }

    requestAnimationFrame(scroll);
  });

  return { cancelMoving, run };
}

interface SpringParams extends MoveParams {
  /**
   * Stiffness (k) - Determines the strength of the spring.
   * 
   * - Higher values make the spring stronger, resulting in faster and more "snappy" movements.
   * - Lower values produce slower, softer motion with a "looser" feel.
   * - Physically, it represents the force needed to stretch or compress the spring.
   * 
   * @see Hooke's Law (F = -kx)
   */
  stiffness: number; // 스프링 강도

  /**
   * Damping (c) - Controls how quickly the spring comes to rest.
   * 
   * - Higher values reduce the amount of oscillation, leading to a quicker, more overdamped motion.
   * - Lower values allow more oscillation, resulting in a bouncier, underdamped effect.
   * - Critical damping (c = 2 * sqrt(k * m)) means the system reaches rest as quickly as possible without oscillating.
   * 
   * @see Damped Harmonic Motion
   */
  damping: number; // 마찰 계수

  /**
   * Mass (m) - Represents the inertia of the moving object.
   * 
   * - Heavier mass means slower acceleration and a more sluggish response.
   * - Lighter mass results in quicker acceleration and a faster response to force.
   * - Physically, it influences the frequency and duration of the oscillation.
   * 
   * @see Newton's Second Law (F = ma)
   */
  mass: number; // 질량
}
/**
 * Animates a value using a spring physics model, providing a more "natural" motion.
 * 
 * @see https://developer.apple.com/videos/play/wwdc2023/10158
 */
export function springTo(
  callback: MoveCallback,
  params: SpringParams
) {
  const { 
    from, 
    dest, 
    duration, 
    stiffness, 
    damping, 
    mass
  } = params;

  let lifeCycle = true;
  const displacement = dest - from;

  const cancelMoving = () => {
    lifeCycle = false;
  };

  const angularFreq = Math.sqrt(stiffness / mass);
  const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));

  const run = async () => new Promise<boolean>((res) => {
    const start = Date.now();

    const animate = () => {
      if (!lifeCycle) return res(false);

      const elapsed = (Date.now() - start) / duration;

      let currentValue;

      // 과/임계/저감쇠 처리
      if (dampingRatio < 1) {
        // 저감쇠 (Underdamped)
        const envelope = Math.exp(-dampingRatio * angularFreq * elapsed);
        const oscillation = Math.cos(angularFreq * Math.sqrt(1 - dampingRatio ** 2) * elapsed);
        const decay = displacement * envelope * oscillation;
        currentValue = dest - decay;
      } else {
        // 과/임계 감쇠 (Overdamped / Critically damped)
        const decay = Math.exp(-angularFreq * elapsed);
        currentValue = dest - displacement * decay;
      }

      callback(currentValue);

      // 거의 정지 상태라면 애니메이션 종료
      if (Math.abs(currentValue - dest) < 0.01) return res(true);
      
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  });

  return { cancelMoving, run };
}
