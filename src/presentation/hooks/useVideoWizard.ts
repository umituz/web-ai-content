/**
 * useVideoWizard Hook
 * React hook for the video generation wizard
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import type { VideoWizardStep, VideoWizardData } from '../../application/flows/video.wizard';

/**
 * useVideoWizard hook options
 */
export interface UseVideoWizardOptions {
  initialStep?: VideoWizardStep;
  onStepChange?: (from: VideoWizardStep, to: VideoWizardStep) => void;
  onComplete?: (data: VideoWizardData) => void;
}

/**
 * useVideoWizard hook return
 */
export interface UseVideoWizardReturn {
  // State
  currentStep: VideoWizardStep;
  steps: Array<{ id: string; label: string; icon?: string; description?: string }>;
  wizardData: VideoWizardData;
  isProcessing: boolean;
  progress: number;

  // Navigation
  next: () => void;
  back: () => void;
  skip: () => void;
  goTo: (step: VideoWizardStep) => void;

  // Data management
  updateData: (updates: Partial<VideoWizardData>) => void;
  setData: (data: VideoWizardData) => void;

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
 * Video wizard steps
 */
const WIZARD_STEPS = [
  { id: 'select-type', label: 'Select Type', icon: 'Video', description: 'Choose generation type' },
  { id: 'input-source', label: 'Source', icon: 'FileInput', description: 'Provide source material' },
  { id: 'configure', label: 'Configure', icon: 'Settings', description: 'Set duration and style' },
  { id: 'advanced', label: 'Advanced', icon: 'Sliders', description: 'Additional options' },
  { id: 'preview', label: 'Preview', icon: 'Eye', description: 'Review settings' },
  { id: 'generating', label: 'Generating', icon: 'Sparkles', description: 'AI is creating' },
  { id: 'results', label: 'Results', icon: 'Video', description: 'Video is ready' },
];

/**
 * useVideoWizard hook
 */
export function useVideoWizard(options: UseVideoWizardOptions = {}): UseVideoWizardReturn {
  const [currentStep, setCurrentStep] = useState<VideoWizardStep>(
    options.initialStep || 'select-type'
  );
  const [wizardData, setWizardData] = useState<VideoWizardData>({});
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
      const to = steps[currentIndex + 1].id as VideoWizardStep;
      setCurrentStep(to);
      optionsRef.current.onStepChange?.(from, to);
    }
  }, [currentIndex, currentStep, steps]);

  const back = useCallback(() => {
    if (currentIndex > 0) {
      const from = currentStep;
      const to = steps[currentIndex - 1].id as VideoWizardStep;
      setCurrentStep(to);
      optionsRef.current.onStepChange?.(from, to);
    }
  }, [currentIndex, currentStep, steps]);

  const skip = useCallback(() => {
    next();
  }, [next]);

  const goTo = useCallback((step: VideoWizardStep) => {
    const from = currentStep;
    setCurrentStep(step);
    optionsRef.current.onStepChange?.(from, step);
  }, [currentStep]);

  const updateData = useCallback((updates: Partial<VideoWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);

  const setData = useCallback((data: VideoWizardData) => {
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
