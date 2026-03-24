/**
 * useImageWizard Hook
 * React hook for the image generation wizard
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import type { ImageWizardStep, ImageWizardData } from '../../application/flows/image.wizard';

/**
 * useImageWizard hook options
 */
export interface UseImageWizardOptions {
  initialStep?: ImageWizardStep;
  onStepChange?: (from: ImageWizardStep, to: ImageWizardStep) => void;
  onComplete?: (data: ImageWizardData) => void;
}

/**
 * useImageWizard hook return
 */
export interface UseImageWizardReturn {
  // State
  currentStep: ImageWizardStep;
  steps: Array<{ id: string; label: string; icon?: string; description?: string }>;
  wizardData: ImageWizardData;
  isProcessing: boolean;
  progress: number;

  // Navigation
  next: () => void;
  back: () => void;
  skip: () => void;
  goTo: (step: ImageWizardStep) => void;

  // Data management
  updateData: (updates: Partial<ImageWizardData>) => void;
  setData: (data: ImageWizardData) => void;

  // State management
  setIsProcessing: (processing: boolean) => void;

  // Validation
  canGoNext: () => boolean;
  canGoBack: () => boolean;
  canSkip: () => boolean;

  // Utilities
  isComplete: () => boolean;
  reset: () => void;
}

/**
 * Image wizard steps
 */
const WIZARD_STEPS = [
  { id: 'input-prompt', label: 'Describe Image', icon: 'Image', description: 'Describe the image you want' },
  { id: 'select-style', label: 'Style', icon: 'Palette', description: 'Choose artistic style' },
  { id: 'configure', label: 'Configure', icon: 'Settings', description: 'Set format and quality' },
  { id: 'advanced', label: 'Advanced', icon: 'Sliders', description: 'Color palette options' },
  { id: 'preview', label: 'Preview', icon: 'Eye', description: 'Review settings' },
  { id: 'generating', label: 'Generating', icon: 'Sparkles', description: 'AI is creating' },
  { id: 'results', label: 'Results', icon: 'Image', description: 'Image is ready' },
];

/**
 * useImageWizard hook
 */
export function useImageWizard(options: UseImageWizardOptions = {}): UseImageWizardReturn {
  const [currentStep, setCurrentStep] = useState<ImageWizardStep>(
    options.initialStep || 'input-prompt'
  );
  const [wizardData, setWizardData] = useState<ImageWizardData>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const steps = useMemo(() => WIZARD_STEPS, []);

  // Memoize current index to avoid repeated findIndex calls
  const currentIndex = useMemo(() => {
    return steps.findIndex(s => s.id === currentStep);
  }, [currentStep, steps]);

  // Calculate progress with useMemo to avoid recalculation on every render
  const progress = useMemo(() => {
    return Math.round((currentIndex / (steps.length - 1)) * 100);
  }, [currentIndex, steps.length]);

  // Stable callbacks with refs for options to prevent unnecessary re-renders
  const optionsRef = useRef(options);
  useMemo(() => {
    optionsRef.current = options;
  }, [options]);

  const next = useCallback(() => {
    if (currentIndex < steps.length - 1) {
      const from = currentStep;
      const to = steps[currentIndex + 1].id as ImageWizardStep;
      setCurrentStep(to);
      optionsRef.current.onStepChange?.(from, to);
    }
  }, [currentIndex, currentStep, steps]);

  const back = useCallback(() => {
    if (currentIndex > 0) {
      const from = currentStep;
      const to = steps[currentIndex - 1].id as ImageWizardStep;
      setCurrentStep(to);
      optionsRef.current.onStepChange?.(from, to);
    }
  }, [currentIndex, currentStep, steps]);

  const skip = useCallback(() => {
    next();
  }, [next]);

  const goTo = useCallback((step: ImageWizardStep) => {
    const from = currentStep;
    setCurrentStep(step);
    optionsRef.current.onStepChange?.(from, step);
  }, [currentStep]);

  const updateData = useCallback((updates: Partial<ImageWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);

  const setData = useCallback((data: ImageWizardData) => {
    setWizardData(data);
  }, []);

  const canGoNext = useCallback(() => {
    return currentIndex < steps.length - 1;
  }, [currentIndex, steps.length]);

  const canGoBack = useCallback(() => {
    return currentIndex > 0;
  }, [currentIndex]);

  const canSkip = useCallback(() => {
    const stepId = steps[currentIndex]?.id;
    return stepId === 'advanced'; // Only advanced step is optional
  }, [currentIndex, steps]);

  const isComplete = useCallback(() => {
    return currentStep === 'results';
  }, [currentStep]);

  const reset = useCallback(() => {
    const initialStep = optionsRef.current.initialStep || 'input-prompt';
    setCurrentStep(initialStep);
    setWizardData({});
    setIsProcessing(false);
  }, []);

  return {
    currentStep,
    steps,
    wizardData,
    isProcessing,
    progress,
    next,
    back,
    skip,
    goTo,
    updateData,
    setData,
    setIsProcessing,
    canGoNext,
    canGoBack,
    canSkip,
    isComplete,
    reset,
  };
}
