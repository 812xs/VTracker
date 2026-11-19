import { useEffect, useState } from "react";
import { Panel, Section } from "../../shared/ui/Section";
import { EmptyState, Skeleton } from "../../shared/ui/State";
import { formatNumber, formatRemaining } from "../../shared/format/format";
import type { Offer, Store } from "../../shared/session/types";
import "./store.css";

function OfferCard({ offer, vp }: { offer: Offer; vp: number }) {
  const enough = offer.price <= vp;
  return (
    <li className="offer">
      {offer.icon ? (
        <img className="offer__img" src={offer.icon} alt="" loading="lazy" />
      ) : (
        <span className="offer__img" />
      )}
      <span className="offer__name">{offer.name}</span>
      <span className="offer__price">
        {formatNumber(offer.price)} VP
        {offer.originalPrice !== null && offer.originalPrice > offer.price ? (
          <s className="offer__old">{formatNumber(offer.originalPrice)}</s>
        ) : null}
        {offer.discountPercent ? (
          <span className="offer__tag">-%{offer.discountPercent}</span>
        ) : null}
      </span>
      <span className={enough ? "offer__state offer__state--ok" : "offer__state"}>
        {enough ? "Bakiye yeterli" : `${formatNumber(offer.price - vp)} VP eksik`}
      </span>
    </li>
  );
}

interface StorePageProps {
  data: Store | null;
  loading: boolean;
  error: string | null;
}

export default function StorePage({ data, loading, error }: StorePageProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  if (!data) {
    return loading ? (
      <Skeleton rows={8} />
    ) : (
      <EmptyState message={error ?? "Mağaza verisi yok."} />
    );
  }

  const { wallet, daily, nightMarket } = data;

  return (
    <div className="store">
      <div className="store__wallet">
        <Panel className="store__coin">
          <span className="store__label">VP</span>
          <span className="store__amount">{formatNumber(wallet.vp)}</span>
        </Panel>
        <Panel className="store__coin">
          <span className="store__label">Radianite</span>
          <span className="store__amount">{formatNumber(wallet.radianite)}</span>
        </Panel>
        <Panel className="store__coin">
          <span className="store__label">Kingdom</span>
          <span className="store__amount">{formatNumber(wallet.kingdom)}</span>
        </Panel>
      </div>

      <Section
        title="Günlük teklifler"
        aside={`Kalan süre: ${formatRemaining(daily.expiresAt, now)}`}
      >
        {daily.offers.length === 0 ? (
          <EmptyState message="Günlük teklif bulunamadı." />
        ) : (
          <ul className="store__grid store__grid--daily">
            {daily.offers.map((o) => (
              <OfferCard key={o.id} offer={o} vp={wallet.vp} />
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Gece pazarı"
        aside={nightMarket ? `Kalan süre: ${formatRemaining(nightMarket.expiresAt, now)}` : undefined}
      >
        {nightMarket ? (
          <ul className="store__grid store__grid--night">
            {nightMarket.offers.map((o) => (
              <OfferCard key={o.id} offer={o} vp={wallet.vp} />
            ))}
          </ul>
        ) : (
          <EmptyState message="Gece pazarı şu anda açık değil." />
        )}
      </Section>
    </div>
  );
}
