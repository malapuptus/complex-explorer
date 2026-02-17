/**
 * usePackSelection — manages pack selection, resolution, and custom pack refresh.
 * Extracted from DemoSession to keep it under the 350-line budget.
 */

import { useState, useCallback } from "react";
import { getStimulusList } from "@/domain";
import type { StimulusList } from "@/domain";
import { localStorageStimulusStore } from "@/infra";
import { buildPackOptions } from "./DemoSessionHelpers";
import type { PackOption } from "./DemoSessionHelpers";

export interface PackSelection {
  packOptions: PackOption[];
  selectedPackKey: string;
  setSelectedPackKey: (key: string) => void;
  selectedOption: PackOption;
  list: StimulusList;
  isLongPack: boolean;
  refreshPacks: () => void;
  resolveList: (id: string, version: string) => StimulusList | undefined;
}

export function usePackSelection(): PackSelection {
  const [packOptions, setPackOptions] = useState<PackOption[]>(() =>
    buildPackOptions(localStorageStimulusStore.list()),
  );
  const [selectedPackKey, setSelectedPackKey] = useState(
    `${packOptions[0].id}@${packOptions[0].version}`,
  );

  const refreshPacks = useCallback(() => {
    setPackOptions(buildPackOptions(localStorageStimulusStore.list()));
  }, []);

  const selectedOption = packOptions.find(
    (p) => `${p.id}@${p.version}` === selectedPackKey,
  )!;

  const resolveList = useCallback(
    (id: string, version: string): StimulusList | undefined => {
      return getStimulusList(id, version) ?? localStorageStimulusStore.load(id, version);
    },
    [],
  );

  const list = resolveList(selectedOption.id, selectedOption.version)!;
  const isLongPack = list.words.length > 10;

  return {
    packOptions,
    selectedPackKey,
    setSelectedPackKey,
    selectedOption,
    list,
    isLongPack,
    refreshPacks,
    resolveList,
  };
}
