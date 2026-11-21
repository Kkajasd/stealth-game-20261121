// input.js — keyboard and mouse for The Lantern Thief.
//
// Keyboard: WASD or arrows to move, Shift to sneak (slow, quiet, harder to
// spot), M to mute, R to restart the level, Esc to pause. Mouse: click a
// floor tile to walk there; the thief steers toward the target and stops on
// arrival. Clicking a wall or a crate does nothing.

function makeInput(canvas) {
  const input = {
    keys: {},
    moveX: 0,
    moveY: 0,
    sneaking: false,
    clickTarget: null,
    onKey: null,
    onClick: null,
    update: function () {
      const k = this.keys;
      let x = 0;
      let y = 0;
      if (k["arrowleft"] || k["a"]) x -= 1;
      if (k["arrowright"] || k["d"]) x += 1;
      if (k["arrowup"] || k["w"]) y -= 1;
      if (k["arrowdown"] || k["s"]) y += 1;
      if (x !== 0 && y !== 0) {
        x *= Math.SQRT1_2;
        y *= Math.SQRT1_2;
      }
      this.moveX = x;
      this.moveY = y;
      this.sneaking = Boolean(k["shift"]);
      // A fresh keypress cancels a click-to-move target.
      if (x !== 0 || y !== 0) this.clickTarget = null;
    },
  };

  window.addEventListener("keydown", function (e) {
    const key = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].indexOf(key) !== -1) {
      e.preventDefault();
    }
    if (!e.repeat && input.onKey) input.onKey(key);
    input.keys[key] = true;
    input.update();
  });
  window.addEventListener("keyup", function (e) {
    input.keys[e.key.toLowerCase()] = false;
    input.update();
  });
  window.addEventListener("blur", function () {
    input.keys = {};
    input.update();
  });

  canvas.addEventListener("mousedown", function (e) {
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
    if (input.onClick) input.onClick(px, py);
  });

  return input;
}
