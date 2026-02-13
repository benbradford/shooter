import type { IState, IStateEnterProps } from '../../../systems/state/IState';
import type { Entity } from '../../Entity';
import { Direction } from '../../../constants/Direction';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { DifficultyComponent } from '../../components/ai/DifficultyComponent';
import { KnockbackComponent } from '../../components/movement/KnockbackComponent';
import { getBulletDudeDifficultyConfig, type BulletDudeDifficulty } from './BulletDudeDifficulty';

const KNOCKBACK_FORCE = 500;

type StunnedStateData = {
  hitDirX: number;
  hitDirY: number;
};

export class BulletDudeStunnedState implements IState<void | StunnedStateData> {
  private stunTimer = 0;
  private knockbackApplied = false;
  private hitDirX = 0;
  private hitDirY = -1;

  constructor(private readonly entity: Entity) {}

  onEnter(props?: IStateEnterProps<void | StunnedStateData>): void {
    this.stunTimer = 0;
    this.knockbackApplied = false;
    
    if (props?.data && typeof props.data === 'object' && 'hitDirX' in props.data) {
      this.hitDirX = props.data.hitDirX;
      this.hitDirY = props.data.hitDirY;
    }
    
    this.applyKnockback();
  }

  onUpdate(delta: number): void {
    const difficulty = this.entity.require(DifficultyComponent<BulletDudeDifficulty>);
    const config = getBulletDudeDifficultyConfig(difficulty.difficulty);

    this.stunTimer += delta;

    if (this.stunTimer >= config.stunTime) {
      const stateMachine = this.entity.require(StateMachineComponent);
      stateMachine.stateMachine.enter('shooting');
    }
  }

  private applyKnockback(): void {
    if (this.knockbackApplied) return;
    this.knockbackApplied = true;

    const sprite = this.entity.require(SpriteComponent);
    const knockback = this.entity.require(KnockbackComponent);

    const currentDirection = this.getCurrentDirection(sprite);
    const dirName = Direction[currentDirection].toLowerCase();
    sprite.sprite.play(`bulletdude_idle_${dirName}`, true);

    knockback.applyKnockback(this.hitDirX, this.hitDirY, KNOCKBACK_FORCE);
  }

  private getCurrentDirection(sprite: SpriteComponent): Direction {
    const animKey = sprite.sprite.anims.currentAnim?.key ?? 'bulletdude_idle_down';
    const dirName = animKey.split('_').pop() ?? 'down';

    const directionMap: Record<string, Direction> = {
      'down': Direction.Down,
      'up': Direction.Up,
      'left': Direction.Left,
      'right': Direction.Right,
      'upleft': Direction.UpLeft,
      'upright': Direction.UpRight,
      'downleft': Direction.DownLeft,
      'downright': Direction.DownRight
    };

    return directionMap[dirName] ?? Direction.Down;
  }
}
