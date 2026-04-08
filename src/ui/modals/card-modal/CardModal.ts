import { DropdownComponent, Modal } from 'obsidian';
import BetterRecallPlugin from 'src/main';
import {
  CARD_MODAL_DESCRIPTION,
  SETTING_ITEM_DESCRIPTION,
} from 'src/ui/classes';
import { ButtonsBarComponent } from 'src/ui/components/ButtonsBarComponent';
import { InputAreaComponent } from 'src/ui/components/input/InputAreaComponent';
import { InputFieldComponent } from 'src/ui/components/input/InputFieldComponent';
import { cn } from 'src/util';
import { CardType } from 'src/spaced-repetition';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export abstract class CardModal extends Modal {
  private optionsContainerEl: HTMLElement;
  protected typeFieldsContainerEl: HTMLElement;

  protected currentCardType: CardType = CardType.BASIC;
  protected deckDropdownComp: DropdownComponent;
  protected frontInputComp: InputAreaComponent;
  protected backInputComp: InputAreaComponent;
  protected optionInputComps: InputFieldComponent[] = [];
  protected correctIndexDropdown: DropdownComponent;
  protected buttonsBarComp: ButtonsBarComponent;

  constructor(protected plugin: BetterRecallPlugin) {
    super(plugin.app);
  }

  onOpen(): void {
    super.onOpen();

    this.optionsContainerEl = this.contentEl.createDiv(
      'better-recall-card__add-options',
    );

    this.render();
  }

  onClose(): void {
    this.frontInputComp?.keyboardListener.cleanup();
    this.backInputComp?.keyboardListener.cleanup();
    this.optionInputComps.forEach((c) => c.keyboardListener.cleanup());
    super.onClose();
    this.plugin.decksManager.save();
    this.contentEl.empty();
  }

  protected abstract render(): void;

  protected abstract submit(): void;

  protected renderDeckDropdown(): void {
    const decks = Object.entries(this.plugin.decksManager.getDecks()).reduce<
      Record<string, string>
    >((curr, [id, deck]) => {
      curr[id] = deck.getName();
      return curr;
    }, {});

    // Renders the deck dropdown.
    this.optionsContainerEl.createEl('p', {
      text: 'Deck:',
      cls: cn(SETTING_ITEM_DESCRIPTION, CARD_MODAL_DESCRIPTION),
    });
    this.deckDropdownComp = new DropdownComponent(
      this.optionsContainerEl,
    ).addOptions(decks);
    this.deckDropdownComp.selectEl.addClass('better-recall-field');
  }

  protected renderCardTypeDropdown(initialType: CardType = CardType.BASIC): void {
    this.currentCardType = initialType;
    this.optionsContainerEl.createEl('p', {
      text: 'Type:',
      cls: cn(SETTING_ITEM_DESCRIPTION, CARD_MODAL_DESCRIPTION),
    });
    const cardTypeDropdown = new DropdownComponent(this.optionsContainerEl)
      .addOptions({
        [String(CardType.BASIC)]: 'Basic',
        [String(CardType.MULTIPLE_CHOICE)]: 'Multiple Choice',
      });
    cardTypeDropdown.setValue(String(initialType));
    cardTypeDropdown.onChange((value) => {
      this.currentCardType = parseInt(value) as CardType;
      this.onCardTypeChange();
    });
    cardTypeDropdown.selectEl.addClass('better-recall-field');
  }

  protected createTypeFieldsContainer(): void {
    this.typeFieldsContainerEl = this.contentEl.createDiv();
  }

  private onCardTypeChange(): void {
    this.frontInputComp?.keyboardListener.cleanup();
    this.backInputComp?.keyboardListener.cleanup();
    this.optionInputComps.forEach((c) => c.keyboardListener.cleanup());
    this.optionInputComps = [];

    this.typeFieldsContainerEl.empty();
    this.renderTypeFields();
    this.buttonsBarComp.setSubmitButtonDisabled(true);
  }

  protected renderTypeFields(
    initialFront?: string,
    initialBack?: string,
    initialOptions?: string[],
    initialCorrectIndex?: number,
  ): void {
    if (this.currentCardType === CardType.BASIC) {
      this.renderBasicTypeFields(initialFront, initialBack);
    } else {
      this.renderMultipleChoiceTypeFields(
        initialFront,
        initialOptions,
        initialCorrectIndex,
      );
    }
  }

  protected renderBasicTypeFields(front?: string, back?: string): void {
    const container = this.typeFieldsContainerEl ?? this.contentEl;
    this.frontInputComp = new InputAreaComponent(container, {
      description: 'Front',
    })
      .setValue(front ?? '')
      .onChange(this.handleInputChange.bind(this));
    this.frontInputComp.keyboardListener.onEnter = () => {
      if (this.disabled) {
        return;
      }

      this.submit();
    };

    this.backInputComp = new InputAreaComponent(container, {
      description: 'Back',
    })
      .setValue(back ?? '')
      .onChange(this.handleInputChange.bind(this));
    this.backInputComp.descriptionEl.addClass('better-recall-back-field');
    this.backInputComp.keyboardListener.onEnter = () => {
      if (this.disabled) {
        return;
      }

      this.submit();
    };
  }

  protected renderMultipleChoiceTypeFields(
    front?: string,
    options?: string[],
    correctIndex?: number,
  ): void {
    const container = this.typeFieldsContainerEl ?? this.contentEl;

    this.frontInputComp = new InputAreaComponent(container, {
      description: 'Question',
    })
      .setValue(front ?? '')
      .onChange(this.handleInputChange.bind(this));
    this.frontInputComp.keyboardListener.onEnter = () => {
      if (this.disabled) {
        return;
      }
      this.submit();
    };

    this.optionInputComps = [];
    for (let i = 0; i < 4; i++) {
      const optComp = new InputFieldComponent(container, {
        description: `Option ${OPTION_LABELS[i]}`,
      }).setValue(options?.[i] ?? '');
      optComp.onChange(this.handleInputChange.bind(this));
      this.optionInputComps.push(optComp);
    }

    container.createEl('p', {
      text: 'Correct answer:',
      cls: cn(SETTING_ITEM_DESCRIPTION, CARD_MODAL_DESCRIPTION, 'better-recall-back-field'),
    });
    this.correctIndexDropdown = new DropdownComponent(container).addOptions({
      '0': 'A',
      '1': 'B',
      '2': 'C',
      '3': 'D',
    });
    if (correctIndex !== undefined) {
      this.correctIndexDropdown.setValue(String(correctIndex));
    }
    this.correctIndexDropdown.selectEl.addClass('better-recall-field');
  }

  protected renderButtonsBar(
    submitText: string,
    options: { container?: HTMLElement } = {},
  ): void {
    options.container ??= this.contentEl;
    this.buttonsBarComp = new ButtonsBarComponent(options.container)
      .setSubmitButtonDisabled(true)
      .setSubmitText(submitText)
      .onSubmit(this.submit.bind(this))
      .onClose(this.close.bind(this));
  }

  protected handleInputChange() {
    this.buttonsBarComp.setSubmitButtonDisabled(this.disabled);
  }

  protected get disabled(): boolean {
    if (this.currentCardType === CardType.MULTIPLE_CHOICE) {
      const filledOptions = this.optionInputComps.filter(
        (c) => c.getValue().length > 0,
      );
      return (
        this.frontInputComp.getValue().length === 0 || filledOptions.length < 2
      );
    }
    return (
      this.frontInputComp.getValue().length === 0 ||
      this.backInputComp.getValue().length === 0
    );
  }
}
