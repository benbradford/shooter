/**
 * Level infrastructure entity factory registrations (trigger, exit, eventchainer, cellmodifier, interaction).
 * Side-effect import — registers factories with EntityRegistry.
 */
import type { CellProperty } from '../grid/Grid';
import type GameScene from '../../scenes/GameScene';
import { registerEntityFactory } from '../EntityRegistry';
import { createTriggerEntity } from '../../trigger/TriggerEntity';
import { createLevelExitEntity } from '../../exit/LevelExitEntity';
import { createEventChainerEntity } from '../../eventchainer/EventChainerEntity';
import { createCellModifierEntity } from '../../cellmodifier/CellModifierEntity';
import { createInteractionEntity } from '../../interaction/InteractionEntity';

registerEntityFactory('trigger', (entityDef, ctx) => {
  const data = entityDef.data as { eventToRaise: string; triggerCells: Array<{ col: number; row: number }>; oneShot: boolean };
  return () => createTriggerEntity({
    entityId: entityDef.id, grid: ctx.grid, eventManager: ctx.eventManager,
    eventName: data.eventToRaise, triggerCells: data.triggerCells, oneShot: data.oneShot ?? true
  });
});

registerEntityFactory('exit', (entityDef, ctx) => {
  const data = entityDef.data as { targetLevel: string; targetCol: number; targetRow: number; triggerCells: Array<{ col: number; row: number }>; oneShot?: boolean };
  const eventName = `exit_${entityDef.id}`;
  return () => {
    const trigger = createTriggerEntity({
      entityId: `${entityDef.id}_trigger`, grid: ctx.grid, eventManager: ctx.eventManager,
      eventName, triggerCells: data.triggerCells, oneShot: data.oneShot ?? true
    });
    ctx.entityManager.add(trigger);
    return createLevelExitEntity({
      eventManager: ctx.eventManager, eventName,
      targetLevel: data.targetLevel, targetCol: data.targetCol, targetRow: data.targetRow,
      onTransition: (targetLevel, targetCol, targetRow) => { ctx.onTransition(targetLevel, targetCol, targetRow); }
    });
  };
});

registerEntityFactory('eventchainer', (entityDef, ctx) => {
  const { data } = entityDef;
  return () => createEventChainerEntity({
    eventManager: ctx.eventManager,
    eventsToRaise: data.eventsToRaise as Array<{ event: string; delayMs: number }>,
    startOnEvent: undefined, entityId: entityDef.id
  });
});

registerEntityFactory('cellmodifier', (entityDef, ctx) => {
  const data = entityDef.data as { cellsToModify: Array<{ col: number; row: number; properties?: CellProperty[]; backgroundTexture?: string; layer?: number }> };
  return () => createCellModifierEntity({
    grid: ctx.grid, scene: ctx.scene, entityId: entityDef.id, cellsToModify: data.cellsToModify
  });
});

registerEntityFactory('interaction', (entityDef, ctx) => {
  const data = entityDef.data as { filename: string };
  return () => createInteractionEntity({
    scene: ctx.scene as GameScene, entityId: entityDef.id, filename: data.filename
  });
});
