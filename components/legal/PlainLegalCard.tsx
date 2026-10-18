import { LEGAL_CONTACT_EMAIL, LEGAL_CONTACT_MAILTO } from "@/lib/legal/contact";
import { PLAIN_LEGAL_POINTS } from "@/lib/legal/policy";

export function PlainLegalCard() {
  return (
    <section className="settings-page-card settings-page-card--featured space-y-4">
      {PLAIN_LEGAL_POINTS.map((point) => (
        <div key={point.title}>
          <div className="settings-page-card-head">
            <h2>{point.title}</h2>
          </div>
          <p className="settings-page-card-body">{point.body}</p>
        </div>
      ))}
      <div>
        <div className="settings-page-card-head">
          <h2>Contato</h2>
        </div>
        <p className="settings-page-card-body">
          Dúvidas:{" "}
          <a
            href={LEGAL_CONTACT_MAILTO}
            className="text-accent hover:underline"
          >
            contato
          </a>{" "}
          ({LEGAL_CONTACT_EMAIL}).
        </p>
      </div>
    </section>
  );
}
