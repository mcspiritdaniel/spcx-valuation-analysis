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
    setValues((prev) => {
      const updated = { ...prev, [id]: value };

      // Enforce constraint: Space + AI weights cannot exceed 100%
      if (id === 'Control!C124' || id === 'Control!C126') {
        const space = id === 'Control!C124' ? value : prev['Control!C124'];
        const ai = id === 'Control!C126' ? value : prev['Control!C126'];

        if (space + ai > 1.0) {
          if (id === 'Control!C124') {
            // Space was adjusted, cap AI to remaining space
            updated['Control!C126'] = Math.max(0, 1.0 - space);
          } else {
            // AI was adjusted, cap Space to remaining space
            updated['Control!C124'] = Math.max(0, 1.0 - ai);
          }
        }
      }

      return updated;
    });
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
