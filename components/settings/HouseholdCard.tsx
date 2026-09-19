"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import type { ContributorKind, Sex } from "@/lib/engine/inssTypes";
import type { Person } from "@/lib/engine/household";
import type { MessageKey } from "@/lib/i18n/messages";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppStore } from "@/store/useAppStore";

const SEXES: Sex[] = ["F", "M"];
const KINDS: ContributorKind[] = [
  "clt",
  "mei_5",
  "mei_12",
  "simplified_11",
  "normal_20",
  "facultative_5",
];

function PersonFields({
  person,
  onPatch,
}: {
  person: Person;
  onPatch: (patch: Partial<Pick<Person, "displayName" | "sex" | "birthDate" | "lifeExpectancy" | "contributorKind">>) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="household-form-grid">
      <label className="household-field">
        <span>{t("settings.household.name")}</span>
        <input
          type="text"
          value={person.displayName}
          onChange={(e) => onPatch({ displayName: e.target.value })}
        />
      </label>
      <label className="household-field">
        <span>{t("settings.household.sex")}</span>
        <select
          value={person.sex}
          onChange={(e) => onPatch({ sex: e.target.value as Sex })}
        >
          {SEXES.map((sex) => (
            <option key={sex} value={sex}>
              {t(`settings.household.sex.${sex}` as MessageKey)}
            </option>
          ))}
        </select>
      </label>
      <label className="household-field">
        <span>{t("settings.household.birthDate")}</span>
        <input
          type="date"
          value={person.birthDate}
          onChange={(e) => onPatch({ birthDate: e.target.value })}
        />
      </label>
      <label className="household-field">
        <span>{t("settings.household.lifeExpectancy")}</span>
        <input
          type="number"
          min={55}
          max={120}
          value={person.lifeExpectancy}
          onChange={(e) =>
            onPatch({ lifeExpectancy: Number(e.target.value) || person.lifeExpectancy })
          }
        />
      </label>
      <label className="household-field household-field--wide">
        <span>{t("settings.household.contributor")}</span>
        <select
          value={person.contributorKind}
          onChange={(e) =>
            onPatch({ contributorKind: e.target.value as ContributorKind })
          }
        >
          {KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`settings.household.contributor.${kind}` as MessageKey)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function HouseholdCard() {
  const { t } = useTranslation();
  const household = useAppStore((s) => s.household);
  const addSpouse = useAppStore((s) => s.addSpouse);
  const removeSpouse = useAppStore((s) => s.removeSpouse);
  const patchHouseholdPerson = useAppStore((s) => s.patchHouseholdPerson);
  const setMarriageDate = useAppStore((s) => s.setMarriageDate);
  const [draftName, setDraftName] = useState("");
  const [draftSex, setDraftSex] = useState<Sex>("F");
  const [draftBirth, setDraftBirth] = useState(household.holder.birthDate);

  return (
    <section className="settings-page-card settings-page-card--featured">
      <div className="settings-page-card-head">
        <Users className="w-4 h-4 text-accent" size={16} />
        <h2>{t("settings.household.title")}</h2>
      </div>
      <p className="settings-page-card-body">{t("settings.household.body")}</p>
      <p className="household-notice">{t("settings.household.notice")}</p>

      <h3 className="household-subtitle">{t("settings.household.holder")}</h3>
      <PersonFields
        person={household.holder}
        onPatch={(patch) => patchHouseholdPerson("holder", patch)}
      />

      <h3 className="household-subtitle">{t("settings.household.spouse")}</h3>
      {household.spouse ? (
        <>
          <PersonFields
            person={household.spouse}
            onPatch={(patch) => patchHouseholdPerson("spouse", patch)}
          />
          <label className="household-field mt-3">
            <span>{t("settings.household.marriageDate")}</span>
            <input
              type="date"
              value={household.marriageDate ?? ""}
              onChange={(e) => setMarriageDate(e.target.value || null)}
            />
          </label>
          <button
            type="button"
            className="btn-secondary mt-4"
            onClick={() => removeSpouse()}
          >
            {t("settings.household.removeSpouse")}
          </button>
        </>
      ) : (
        <>
          <p className="settings-page-card-body">{t("settings.household.noSpouse")}</p>
          <div className="household-form-grid mt-3">
            <label className="household-field">
              <span>{t("settings.household.name")}</span>
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
            </label>
            <label className="household-field">
              <span>{t("settings.household.sex")}</span>
              <select
                value={draftSex}
                onChange={(e) => setDraftSex(e.target.value as Sex)}
              >
                {SEXES.map((sex) => (
                  <option key={sex} value={sex}>
                    {t(`settings.household.sex.${sex}` as MessageKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="household-field">
              <span>{t("settings.household.birthDate")}</span>
              <input
                type="date"
                value={draftBirth}
                onChange={(e) => setDraftBirth(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="btn-primary mt-4"
            onClick={() => {
              addSpouse({
                displayName: draftName || t("settings.household.spouse"),
                sex: draftSex,
                birthDate: draftBirth,
              });
              setDraftName("");
            }}
          >
            {t("settings.household.addSpouse")}
          </button>
        </>
      )}
    </section>
  );
}
