import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioVolumeControl } from './audio-volume-control';

describe('AudioVolumeControl', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the hover target whenever the select tool is active', () => {
    render(
      <AudioVolumeControl
        trackLocked={false}
        activeTool="select"
        lineYPercent={50}
        isEditing={false}
        editLabel={null}
        onVolumeMouseDown={vi.fn()}
        onVolumeDoubleClick={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Adjust clip volume' })).toBeInTheDocument();
  });

  it('only enables dragging after the hover delay', () => {
    vi.useFakeTimers();
    const onVolumeMouseDown = vi.fn();

    render(
      <AudioVolumeControl
        trackLocked={false}
        activeTool="select"
        lineYPercent={50}
        isEditing={false}
        editLabel={null}
        onVolumeMouseDown={onVolumeMouseDown}
        onVolumeDoubleClick={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: 'Adjust clip volume' });

    fireEvent.mouseEnter(button);
    fireEvent.mouseDown(button);
    expect(onVolumeMouseDown).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(180);
    });

    fireEvent.mouseDown(button);
    expect(onVolumeMouseDown).toHaveBeenCalledTimes(1);
  });

  it('keeps armed interactions from bubbling to the clip body', () => {
    const parentClick = vi.fn();
    const parentDoubleClick = vi.fn();
    const onVolumeDoubleClick = vi.fn();

    render(
      <div onClick={parentClick} onDoubleClick={parentDoubleClick}>
        <AudioVolumeControl
          trackLocked={false}
          activeTool="select"
          lineYPercent={50}
          isEditing={true}
          editLabel={null}
          onVolumeMouseDown={vi.fn()}
          onVolumeDoubleClick={onVolumeDoubleClick}
        />
      </div>
    );

    const button = screen.getByRole('button', { name: 'Adjust clip volume' });

    fireEvent.click(button);
    fireEvent.doubleClick(button);

    expect(parentClick).not.toHaveBeenCalled();
    expect(parentDoubleClick).not.toHaveBeenCalled();
    expect(onVolumeDoubleClick).toHaveBeenCalledTimes(1);
  });

  it('positions the edit label above the volume line when not dragging (no viewport)', () => {
    render(
      <AudioVolumeControl
        trackLocked={false}
        activeTool="select"
        lineYPercent={40}
        isEditing={true}
        editLabel="Volume -12.0 dB"
        onVolumeMouseDown={vi.fn()}
        onVolumeDoubleClick={vi.fn()}
      />
    );

    const label = screen.getByText('Volume -12.0 dB');
    expect(label.className).toContain('-translate-y-full');
    expect(label).toHaveStyle({ top: 'calc(var(--timeline-audio-volume-line-y, 40%) - 10px)' });
  });

  it('fixes the edit label to the pointer while dragging', () => {
    render(
      <AudioVolumeControl
        trackLocked={false}
        activeTool="select"
        lineYPercent={40}
        isEditing={true}
        editLabel="Volume +3.0 dB"
        editLabelViewport={{ clientX: 120, clientY: 88 }}
        onVolumeMouseDown={vi.fn()}
        onVolumeDoubleClick={vi.fn()}
      />
    );

    const label = screen.getByText('Volume +3.0 dB');
    expect(label.className).toContain('fixed');
    expect(label).toHaveStyle({
      left: '120px',
      top: '88px',
      transform: 'translate(-50%, calc(-100% - 8px))',
    });
  });
});
