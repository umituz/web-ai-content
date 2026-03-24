/**
 * useContentWizard Hook
 * React hook for the content generation wizard
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import type { ContentWizardStep, ContentWizardData } from '../../application/flows/content.wizard';

/**
 * useContentWizard hook options
 */
export interface UseContentWizardOptions {
  initialStep?: ContentWizardStep;
  onStepChange?: (from: ContentWizardStep, to: ContentWizardStep) => void;
  onComplete?: (data: ContentWizardData) => void;
}

/**
 * useContentWizard hook return
 */
export interface UseContentWizardReturn {
  // State
  currentStep: ContentWizardStep;
  steps: Array<{ id: string; label: string; icon?: string; description?: string }>;
  wizardData: ContentWizardData;
  isProcessing: boolean;
  progress: number;

  // Navigation
  next: () => void;
  back: () => void;
  skip: () => void;
  goTo: (step: ContentWizardStep) => void;

  // Data management
  updateData: (updates: Partial<ContentWizardData>) => void;
  setData: (data: ContentWizardData) => void;

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
 * Content wizard steps
 */
const WIZARD_STEPS = [
  { id: 'select-type', label: 'Select Type', icon: 'Layers', description: 'Choose the type of content' },
  { id: 'input-topic', label: 'Topic', icon: 'Lightbulb', description: 'Enter your topic or idea' },
  { id: 'configure', label: 'Configure', icon: 'Settings', description: 'Set tone, audience, platform' },
  { id: 'advanced', label: 'Advanced', icon: 'Sliders', description: 'Additional options' },
  { id: 'preview', label: 'Preview', icon: 'Eye', description: 'Review settings' },
  { id: 'generating', label: 'Generating', icon: 'Sparkles', description: 'AI is generating' },
  { id: 'results', label: 'Results', icon: 'CheckCircle', description: 'Content is ready' },
];

/**
 * useContentWizard hook
 */
export function useContentWizard(options: UseContentWizardOptions = {}): UseContentWizardReturn {
  const [currentStep, setCurrentStep] = useState<ContentWizardStep>(
    options.initialStep || 'select-type'
  );
  const [wizardData, setWizardData] = useState<ContentWizardData>({});
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
      const to = steps[currentIndex + 1].id as ContentWizardStep;
      setCurrentStep(to);
      optionsRef.current.onStepChange?.(from, to);
    }
  }, [currentIndex, currentStep, steps]);

  const back = useCallback(() => {
    if (currentIndex > 0) {
      const from = currentStep;
      const to = steps[currentIndex - 1].id as ContentWizardStep;
      setCurrentStep(to);
      optionsRef.current.onStepChange?.(from, to);
    }
  }, [currentIndex, currentStep, steps]);

  const skip = useCallback(() => {
    next(); // Skip is same as next for optional steps
  }, [next]);

  const goTo = useCallback((step: ContentWizardStep) => {
    const from = currentStep;
    setCurrentStep(step);
    optionsRef.current.onStepChange?.(from, step);
  }, [currentStep]);

  const updateData = useCallback((updates: Partial<ContentWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);

  const setData = useCallback((data: ContentWizardData) => {
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
    const initialStep = optionsRef.current.initialStep || 'select-type';
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
