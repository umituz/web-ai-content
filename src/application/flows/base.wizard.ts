/**
 * Base Wizard Flow
 * Provides the foundation for step-by-step content generation wizards
 */

/**
 * Wizard step definition
 */
export interface WizardStep<T extends string = string> {
  id: T;
  label: string;
  icon?: string;
  description?: string;
  optional?: boolean;
  validate?: (data: unknown) => boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Wizard data storage
 */
export type WizardData = Record<string, unknown>;

/**
 * Wizard configuration
 */
export interface WizardConfig<T extends string = string> {
  steps: WizardStep<T>[];
  initialStep?: T;
  data?: WizardData;
  onStepChange?: (from: T, to: T) => void;
  onComplete?: (data: WizardData) => void;
}

/**
 * Base Wizard Flow Class
 */
export class WizardFlow<TStep extends string = string> {
  protected steps: WizardStep<TStep>[];
  protected currentStep: TStep;
  protected data: WizardData;
  protected config: WizardConfig<TStep>;
  protected isComplete = false;

  constructor(config: WizardConfig<TStep>) {
    this.config = config;
    this.steps = config.steps;
    this.currentStep = config.initialStep || config.steps[0]?.id as TStep;
    this.data = config.data || {};
  }

  /**
   * Get current step
   */
  getCurrentStep(): WizardStep<TStep> | undefined {
    return this.steps.find(step => step.id === this.currentStep);
  }

  /**
   * Get all steps
   */
  getAllSteps(): WizardStep<TStep>[] {
    return this.steps;
  }

  /**
   * Get current step index
   */
  getCurrentStepIndex(): number {
    return this.steps.findIndex(step => step.id === this.currentStep);
  }

  /**
   * Calculate progress percentage
   */
  getProgress(): number {
    const currentIndex = this.getCurrentStepIndex();
    if (currentIndex === -1) return 0;
    return Math.round((currentIndex / (this.steps.length - 1)) * 100);
  }

  /**
   * Check if we can go to the next step
   */
  canGoNext(): boolean {
    const currentIndex = this.getCurrentStepIndex();
    const hasNextStep = currentIndex < this.steps.length - 1;

    if (!hasNextStep) {
      return false;
    }

    const currentStep = this.getCurrentStep();
    if (currentStep?.validate) {
      return currentStep.validate(this.data);
    }

    return true;
  }

  /**
   * Check if we can go to the previous step
   */
  canGoBack(): boolean {
    const currentIndex = this.getCurrentStepIndex();
    return currentIndex > 0;
  }

  /**
   * Check if current step can be skipped
   */
  canSkip(): boolean {
    const currentStep = this.getCurrentStep();
    return currentStep?.optional || false;
  }

  /**
   * Go to the next step
   */
  next(): void {
    if (!this.canGoNext()) {
      throw new Error('Cannot go to next step');
    }

    const currentIndex = this.getCurrentStepIndex();
    const nextStep = this.steps[currentIndex + 1];

    if (nextStep) {
      this.goTo(nextStep.id);
    }
  }

  /**
   * Go to the previous step
   */
  back(): void {
    if (!this.canGoBack()) {
      throw new Error('Cannot go to previous step');
    }

    const currentIndex = this.getCurrentStepIndex();
    const previousStep = this.steps[currentIndex - 1];

    if (previousStep) {
      this.goTo(previousStep.id);
    }
  }

  /**
   * Skip current step (if optional)
   */
  skip(): void {
    if (!this.canSkip()) {
      throw new Error('Cannot skip current step');
    }

    this.next();
  }

  /**
   * Go to a specific step
   */
  goTo(stepId: TStep): void {
    const from = this.currentStep;
    const to = stepId;

    this.currentStep = stepId;

    if (from !== to) {
      this.config.onStepChange?.(from, to);
    }

    // Check if wizard is complete
    const currentIndex = this.getCurrentStepIndex();
    if (currentIndex === this.steps.length - 1) {
      this.isComplete = true;
      this.config.onComplete?.(this.data);
    }
  }

  /**
   * Update wizard data
   */
  updateData(updates: Partial<WizardData>): void {
    this.data = { ...this.data, ...updates };
  }

  /**
   * Get wizard data
   */
  getData(): WizardData {
    return { ...this.data };
  }

  /**
   * Set wizard data
   */
  setData(data: WizardData): void {
    this.data = { ...data };
  }

  /**
   * Validate current step
   */
  validateCurrentStep(): ValidationResult {
    const currentStep = this.getCurrentStep();

    if (!currentStep) {
      return { valid: false, errors: {} };
    }

    if (currentStep.validate) {
      const isValid = currentStep.validate(this.data);
      return {
        valid: isValid,
        errors: isValid ? {} : { [currentStep.id]: 'Validation failed' },
      };
    }

    return { valid: true, errors: {} };
  }

  /**
   * Check if wizard is complete
   */
  isWizardComplete(): boolean {
    return this.isComplete;
  }

  /**
   * Reset wizard to initial state
   */
  reset(): void {
    this.currentStep = this.config.initialStep || this.steps[0]?.id as TStep;
    this.data = this.config.data || {};
    this.isComplete = false;
  }

  /**
   * Get step by ID
   */
  getStep(stepId: TStep): WizardStep<TStep> | undefined {
    return this.steps.find(step => step.id === stepId);
  }

  /**
   * Get next step
   */
  getNextStep(): WizardStep<TStep> | undefined {
    const currentIndex = this.getCurrentStepIndex();
    return this.steps[currentIndex + 1];
  }

  /**
   * Get previous step
   */
  getPreviousStep(): WizardStep<TStep> | undefined {
    const currentIndex = this.getCurrentStepIndex();
    return this.steps[currentIndex - 1];
  }

  /**
   * Execute the wizard (for automated execution)
   */
  async execute(): Promise<WizardData> {
    while (!this.isWizardComplete()) {
      const currentStep = this.getCurrentStep();

      if (!currentStep) {
        throw new Error('Current step not found');
      }

      // If step is optional and has no data, skip it
      if (currentStep.optional && !this.hasStepData(currentStep.id)) {
        this.skip();
        continue;
      }

      // Validate current step
      const validation = this.validateCurrentStep();
      if (!validation.valid) {
        throw new Error(`Validation failed for step: ${currentStep.id}`);
      }

      // Move to next step
      if (this.canGoNext()) {
        this.next();
      } else {
        break;
      }
    }

    return this.getData();
  }

  /**
   * Check if step has data
   */
  protected hasStepData(stepId: string): boolean {
    return Object.keys(this.data).some(key => key.startsWith(stepId));
  }
}

/**
 * Create a wizard flow
 */
export function createWizardFlow<T extends string>(config: WizardConfig<T>): WizardFlow<T> {
  return new WizardFlow(config);
}
