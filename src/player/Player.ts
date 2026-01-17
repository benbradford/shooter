import Phaser from "phaser";
import { Animation } from "../animation/Animation";
import { AnimationSystem } from "../animation/AnimationSystem";
import { Direction, dirFromDelta } from "../animation/Direction";
import { StateMachine } from "../utils/state/StateMachine";
import { IdleState } from "./IdleState";
import { WalkState } from "./WalkState";

export class Player extends Phaser.GameObjects.Sprite {
  public stateMachine: StateMachine;
  public lastDir: Direction = Direction.Down;
  public speed = 300;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: any;
  public animationSystem: AnimationSystem;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "idle_down");
    scene.add.existing(this);
    this.setScale(2);

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys("W,A,S,D");

    // setup animations (same as before)
    const animMap = new Map<string, Animation>();
    const map: [Direction, string][] = [
      [Direction.Down, "down"],
      [Direction.Up, "up"],
      [Direction.Left, "left"],
      [Direction.Right, "right"],
      [Direction.UpLeft, "upleft"],
      [Direction.UpRight, "upright"],
      [Direction.DownLeft, "downleft"],
      [Direction.DownRight, "downright"],
    ];

    map.forEach(([dir, name]) => {
      animMap.set(
        `walk_${dir}`,
        new Animation([1, 2, 3].map(i => `walk_${name}_${i}`), "pingpong", 0.15)
      );
      animMap.set(`idle_${dir}`, new Animation([`idle_${name}`], "static", 0));
    });

    this.animationSystem = new AnimationSystem(animMap, `idle_${Direction.Down}`);

    // setup state machine
    this.stateMachine = new StateMachine(
      {
        idle: new IdleState(this),
        walk: new WalkState(this),
      },
      "idle"
    );
  }

  update(time: number, delta: number) {
    this.stateMachine.update(delta);
    this.animationSystem.update(delta);

    const frame = this.animationSystem.getFrame();
    if (frame) this.setTexture(frame);
  }

  getInputDelta() {
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dy += 1;
    return { dx, dy };
  }
}
