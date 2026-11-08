import React, { useEffect, useRef, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Video, Hexagon } from 'lucide-react';

interface CameraPanPadProps {
  // Moves the camera by (dx, dy) screen pixels; the battlefield is moved the opposite way to show it
  onPan: (dx: number, dy: number) => void;
}

// Pixels the camera moves each animation frame while an arrow is held (about 240 px per second at 60 fps)
const PAN_SPEED = 4;

const DIRECTIONS = [
  { key: 'up', dx: 0, dy: -1, Icon: ChevronUp, cls: 'col-start-2 row-start-1' },
  { key: 'left', dx: -1, dy: 0, Icon: ChevronLeft, cls: 'col-start-1 row-start-2' },
  { key: 'right', dx: 1, dy: 0, Icon: ChevronRight, cls: 'col-start-3 row-start-2' },
  { key: 'down', dx: 0, dy: 1, Icon: ChevronDown, cls: 'col-start-2 row-start-3' }
] as const;

/**
 * A d-pad that pans the view while an arrow is held down. The icon in the middle says what the arrows move: the camera
 * (camera icon), or, after clicking it, the battlefield (green hexagon), which reverses the arrows.
 */
export const CameraPanPad: React.FC<CameraPanPadProps> = ({ onPan }) => {
  const [movesBattlefield, setMovesBattlefield] = useState(false);
  const frameRef = useRef<number | null>(null);
  const onPanRef = useRef(onPan);
  onPanRef.current = onPan;

  const stop = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  };
  const start = (dx: number, dy: number) => {
    stop();
    // Moving the battlefield one way is moving the camera the other way
    const sign = movesBattlefield ? -1 : 1;
    const step = () => {
      onPanRef.current(sign * dx * PAN_SPEED, sign * dy * PAN_SPEED);
      frameRef.current = requestAnimationFrame(step);
    };
    step();
  };
  useEffect(() => stop, []);

  const what = movesBattlefield ? 'battlefield' : 'camera';
  return (
    <div
      className="grid grid-cols-3 grid-rows-3 gap-px bg-stone-950/80 border border-stone-800 rounded-lg p-0.5 shadow-xs select-none"
      title={`Hold an arrow to move the ${what}`}
    >
      {DIRECTIONS.map(({ key, dx, dy, Icon, cls }) => (
        <button
          key={key}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            start(dx, dy);
          }}
          onPointerUp={stop}
          onPointerCancel={stop}
          onLostPointerCapture={stop}
          className={`${cls} w-7 h-7 flex items-center justify-center hover:bg-stone-800 rounded text-stone-300 transition-colors cursor-pointer ${
            movesBattlefield ? 'hover:text-emerald-300' : 'hover:text-sky-300'
          }`}
          title={`Move the ${what} ${key}`}
        >
          <Icon className="w-5 h-5" />
        </button>
      ))}
      <button
        onClick={() => setMovesBattlefield((b) => !b)}
        className={`col-start-2 row-start-2 w-7 h-7 flex items-center justify-center rounded hover:bg-stone-800 transition-colors cursor-pointer ${
          movesBattlefield ? 'text-emerald-400' : 'text-sky-400'
        }`}
        title={movesBattlefield ? 'Arrows move the battlefield (click: move the camera)' : 'Arrows move the camera (click: move the battlefield)'}
      >
        {movesBattlefield ? <Hexagon className="w-5 h-5" /> : <Video className="w-5 h-5" />}
      </button>
    </div>
  );
};
