import BetterRecallPlugin from 'src/main';
import { CardModal } from './CardModal';
import { CardType, SpacedRepetitionItem } from 'src/spaced-repetition';
import { Deck } from 'src/data/deck';
import { ButtonComponent } from 'obsidian';

export class EditCardModal extends CardModal {
  constructor(
    protected plugin: BetterRecallPlugin,
    private deck: Deck,
    private card: SpacedRepetitionItem,
  ) {
    super(plugin);
    this.setTitle('Edit card');
  }

  protected render(): void {
    this.renderCardTypeDropdown(this.card.type);
    this.renderDeckDropdown();
    this.createTypeFieldsContainer();

    if (this.card.type === CardType.MULTIPLE_CHOICE) {
      this.renderTypeFields(
        this.card.content.front,
        undefined,
        this.card.content.options,
        this.card.content.correctIndex,
      );
    } else {
      this.renderTypeFields(this.card.content.front, this.card.content.back);
    }

    const buttonsContainer = this.contentEl.createDiv(
      'better-recall__buttons-container',
    );
    const deleteButton = new ButtonComponent(buttonsContainer)
      .setButtonText('Delete')
      .onClick(() => this.deleteCard());
    deleteButton.buttonEl.addClass('better-recall-delete-button');
    this.renderButtonsBar('Save', { container: buttonsContainer });
    // Pre-filled cards are valid — enable submit immediately.
    this.buttonsBarComp.setSubmitButtonDisabled(false);
  }

  private deleteCard(): void {
    this.plugin.decksManager.removeCard(this.deck.id, this.card.id);
    this.plugin
      .getEventEmitter()
      .emit('deleteItem', { deckId: this.deck.id, deletedItem: this.card });
    this.close();
  }

  protected submit(): void {
    const deckId = this.deckDropdownComp.getValue();
    const front = this.frontInputComp.getValue();

    let updatedCard: SpacedRepetitionItem;

    if (this.currentCardType === CardType.BASIC) {
      const back = this.backInputComp.getValue();
      this.frontInputComp.setValue('');
      this.backInputComp.setValue('');
      updatedCard = { ...this.card, type: CardType.BASIC, content: { front, back } };
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

      updatedCard = {
        ...this.card,
        type: CardType.MULTIPLE_CHOICE,
        content: {
          front,
          options,
          correctIndex: correctIndex >= 0 ? correctIndex : 0,
        },
      };
    }

    if (deckId === this.deck.id) {
      this.plugin.decksManager.updateCardContent(deckId, updatedCard);
    } else {
      this.plugin.decksManager.removeCard(deckId, updatedCard.id);
      this.plugin.decksManager.addCard(deckId, updatedCard);
    }

    this.plugin
      .getEventEmitter()
      .emit('editItem', { deckId, newItem: updatedCard });

    this.close();
  }
}
