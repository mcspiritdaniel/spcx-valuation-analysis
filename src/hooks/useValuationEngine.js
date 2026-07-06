import { useCallback, useMemo, useState } from 'react';
import { runFullEngine } from '../engine/operating_engine.mjs';
import schemaSource from '../../spcx_control_schema.json';
import {
  buildInitialValues,
  buildPatchedSchema,
} from '../utils/schema';

export function useValuationEngine() {
  const [values, setValues] = useState(() => buildInitialValues(schemaSource));

  const result = useMemo(() => {
    const patchedSchema = buildPatchedSchema(schemaSource, values);
    return runFullEngine(patchedSchema);
  }, [values]);

  const updateValue = useCallback((id, value) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setValues(buildInitialValues(schemaSource));
  }, []);

  const sliders = useMemo(
    () => schemaSource.controls.filter((c) => c.input_type === 'slider'),
    []
  );

  return {
    values,
    updateValue,
    resetToDefaults,
    result,
    sliders,
    perShareRounded: result.valuation.perShareRounded,
  };
}
