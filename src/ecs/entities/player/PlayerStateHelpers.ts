import type { InputComponent } from '../../components/input/InputComponent';
import type { AttackComboComponent } from '../../components/combat/AttackComboComponent';

export function handlePunchInput(
  input: InputComponent,
  attackCombo: AttackComboComponent
): boolean {
  const isPressed = input.isAttackPressed();
  attackCombo.checkAttackReleased(isPressed);

  if (isPressed) {
    attackCombo.tryStartPunch();
    return true;
  }

  if (attackCombo.isPunching()) {
    return true;
  }

  return false;
}
