#!/usr/bin/env python3
import re
from pathlib import Path

COMPONENT_MAP = {
    'TransformComponent': 'core', 'SpriteComponent': 'core', 'AnimationComponent': 'core',
    'AnimatedSpriteComponent': 'core', 'StateMachineComponent': 'core', 'HealthComponent': 'core',
    'DamageComponent': 'core', 'ShadowComponent': 'core',
    'WalkComponent': 'movement', 'GridPositionComponent': 'movement', 'GridCollisionComponent': 'movement',
    'KnockbackComponent': 'movement',
    'InputComponent': 'input', 'TouchJoystickComponent': 'input', 'AimJoystickComponent': 'input',
    'ControlModeComponent': 'input',
    'ProjectileComponent': 'combat', 'ProjectileEmitterComponent': 'combat', 'CollisionComponent': 'combat',
    'AmmoComponent': 'combat', 'LineOfSightComponent': 'combat',
    'PatrolComponent': 'ai', 'RobotDifficultyComponent': 'ai', 'FireballPropertiesComponent': 'ai',
    'HitFlashComponent': 'visual', 'ParticleTrailComponent': 'visual', 'PulsingScaleComponent': 'visual',
    'RobotHitParticlesComponent': 'visual', 'OverheatSmokeComponent': 'visual', 'ShellCasingComponent': 'visual',
    'HudBarComponent': 'ui', 'JoystickVisualsComponent': 'ui', 'AimJoystickVisualsComponent': 'ui',
    'CrosshairVisualsComponent': 'ui',
}

def get_folder_from_path(file_path):
    parts = Path(file_path).parts
    if 'components' in parts:
        idx = parts.index('components')
        if idx + 1 < len(parts):
            return parts[idx + 1]
    return None

def update_file(file_path):
    current_folder = get_folder_from_path(file_path)
    if not current_folder:
        return False
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    original = content
    
    for component, target_folder in COMPONENT_MAP.items():
        # Match: from './ComponentName' or from "./ComponentName"
        pattern = rf"from (['\"])\.\/{component}(['\"])"
        
        if current_folder == target_folder:
            # Same folder - no change needed
            continue
        else:
            # Different folder
            replacement = rf"from \1../{target_folder}/{component}\2"
            content = re.sub(pattern, replacement, content)
    
    if content != original:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"Updated: {file_path}")
        return True
    return False

base_dir = Path('src/ecs/components')
updated = 0
for ts_file in base_dir.rglob('*.ts'):
    if update_file(ts_file):
        updated += 1

print(f"\nTotal files updated: {updated}")
