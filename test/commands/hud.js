function getJoystickVisuals() {
  const hudScene = window.game.scene.scenes.find(s => s.scene.key === 'HudScene');
  const joystick = hudScene.joystickEntity;
  
  const visuals = joystick.get(window.JoystickVisualsComponent);
  
  return {
    outerCircle: {
      x: visuals.outerCircle.x,
      y: visuals.outerCircle.y,
      alpha: visuals.outerCircle.alpha,
      visible: visuals.outerCircle.visible
    },
    innerCircle: {
      x: visuals.innerCircle.x,
      y: visuals.innerCircle.y,
      alpha: visuals.innerCircle.alpha,
      visible: visuals.innerCircle.visible
    }
  };
}

function getAimJoystickVisuals() {
  const hudScene = window.game.scene.scenes.find(s => s.scene.key === 'HudScene');
  const joystick = hudScene.joystickEntity;
  
  const visuals = joystick.get(window.AimJoystickVisualsComponent);
  
  return {
    outerCircle: {
      x: visuals.outerCircle.x,
      y: visuals.outerCircle.y,
      alpha: visuals.outerCircle.alpha,
      visible: visuals.outerCircle.visible
    },
    crosshair: {
      x: visuals.crosshairSprite.x,
      y: visuals.crosshairSprite.y,
      alpha: visuals.crosshairSprite.alpha,
      visible: visuals.crosshairSprite.visible
    }
  };
}
