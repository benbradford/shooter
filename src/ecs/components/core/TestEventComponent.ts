import { BaseEventComponent } from './BaseEventComponent';

const TEST_EVENT_NAME = 'testTrigger';

export class TestEventComponent extends BaseEventComponent {
  init(): void {
    this.registerEvent(TEST_EVENT_NAME);
  }

  onEvent(eventName: string): void {
    if (eventName === TEST_EVENT_NAME) {
      console.log('testTrigger was received');
    }
  }
}
