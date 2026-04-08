import { v4 as uuidv4 } from 'uuid';
import BetterRecallPlugin from '../../../main';
import { CardModal } from './CardModal';
import { CardType } from 'src/spaced-repetition';

export class AddCardModal extends CardModal {
  constructor(protected plugin: BetterRecallPlugin) {
    super(plugin);
    this.setTitle('Add card');
  }

  protected render(): void {
    this.renderCardTypeDropdown();
    this.renderDeckDropdown();
    this.createTypeFieldsContainer();
    this.renderTypeFields();
    this.renderButtonsBar('Add');
  }

  protected submit(): void {
    const deckId = this.deckDropdownComp.getValue();
    const front = this.frontInputComp.getValue();

    if (this.currentCardType === CardType.BASIC) {
      const back = this.backInputComp.getValue();
      this.frontInputComp.setValue('');
      this.backInputComp.setValue('');
      const card = this.plugin.algorithm.createNewCard(uuidv4(), CardType.BASIC, { front, back });
      this.plugin.decksManager.addCard(deckId, card);
      this.plugin.getEventEmitter().emit('addItem', { deckId, item: card });
    } else {
      const allValues = this.optionInputComps.map((c) => c.getValue());
      const filledIndices = allValues
        .map((v, i) => ({ v, i }))
        .filter(({ v }) => v.length > 0);
      const options = filledIndices.map(({ v }) => v);
      const originalCorrectIndex = parseInt(
        this.correctIndexDropdown.getValue(),
      );
      const correctIndex = filledIndices.findIndex(
        ({ i }) => i === originalCorrectIndex,
      );

      this.frontInputComp.setValue('');
      this.optionInputComps.forEach((c) => c.setValue(''));

      const card = this.plugin.algorithm.createNewCard(
        uuidv4(),
        CardType.MULTIPLE_CHOICE,
        { front, options, correctIndex: correctIndex >= 0 ? correctIndex : 0 },
      );
      this.plugin.decksManager.addCard(deckId, card);
      this.plugin.getEventEmitter().emit('addItem', { deckId, item: card });
    }
  }
}
