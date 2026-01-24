#!/usr/bin/env python3
import re
import os
from pathlib import Path

# Component to folder mapping
COMPONENT_MAP = {
    # Core
    'TransformComponent': 'core',
    'SpriteComponent': 'core',
    'AnimationComponent': 'core',
    'AnimatedSpriteComponent': 'core',
    'StateMachineComponent': 'core',
    'HealthComponent': 'core',
    'DamageComponent': 'core',
    'ShadowComponent': 'core',
    # Movement
    'WalkComponent': 'movement',
    'GridPositionComponent': 'movement',
    'GridCollisionComponent': 'movement',
    'KnockbackComponent': 'movement',
    # Input
    'InputComponent': 'input',
    'TouchJoystickComponent': 'input',
    'AimJoystickComponent': 'input',
    'ControlModeComponent': 'input',
    # Combat
    'ProjectileComponent': 'combat',
    'ProjectileEmitterComponent': 'combat',
    'CollisionComponent': 'combat',
    'AmmoComponent': 'combat',
    'LineOfSightComponent': 'combat',
    # AI
    'PatrolComponent': 'ai',
    'RobotDifficultyComponent': 'ai',
    'FireballPropertiesComponent': 'ai',
    # Visual
    'HitFlashComponent': 'visual',
    'ParticleTrailComponent': 'visual',
    'PulsingScaleComponent': 'visual',
    'RobotHitParticlesComponent': 'visual',
    'OverheatSmokeComponent': 'visual',
    'ShellCasingComponent': 'visual',
    # UI
    'HudBarComponent': 'ui',
    'JoystickVisualsComponent': 'ui',
    'AimJoystickVisualsComponent': 'ui',
    'CrosshairVisualsComponent': 'ui',
}

def update_imports(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    original = content
    
    for component, folder in COMPONENT_MAP.items():
        # Match: from '../ecs/components/ComponentName'
        pattern = rf"from (['\"])(\.\./)*ecs/components/{component}(['\"])"
        replacement = rf"from \1\2ecs/components/{folder}/{component}\3"
        content = re.sub(pattern, replacement, content)
    
    if content != original:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"Updated: {file_path}")
        return True
    return False

# Find all TypeScript files
base_dir = Path('src')
updated = 0
for ts_file in base_dir.rglob('*.ts'):
    if update_imports(ts_file):
        updated += 1

print(f"\nTotal files updated: {updated}")
