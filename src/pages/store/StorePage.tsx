import { useEffect, useState } from "react";
import { Card } from "../../shared/ui/Card";
import { EmptyState, RefreshButton, Skeleton } from "../../shared/ui/State";
import { formatNumber, formatRemaining } from "../../shared/format/format";
import { useCommand } from "../../shared/session/useSnapshot";
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

export default function StorePage() {
  const { data, loading, error, reload } = useCommand<Store>("get_store");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  if (!data) {
    return (
      <Card title="Mağaza">
        {loading ? (
          <Skeleton rows={5} />
        ) : (
          <EmptyState message={error ?? "Mağaza verisi yok."} onRefresh={reload} />
        )}
      </Card>
    );
  }

  const { wallet, daily, nightMarket } = data;

  return (
    <div className="store">
      <Card title="Mağaza" action={<RefreshButton onClick={reload} busy={loading} />}>
        <div className="store__wallet">
          <div className="store__coin">
            <span className="store__label">VP</span>
            <span className="store__amount">{formatNumber(wallet.vp)}</span>
          </div>
          <div className="store__coin">
            <span className="store__label">Radianite</span>
            <span className="store__amount">{formatNumber(wallet.radianite)}</span>
          </div>
          <div className="store__coin">
            <span className="store__label">Kingdom</span>
            <span className="store__amount">{formatNumber(wallet.kingdom)}</span>
          </div>
        </div>
      </Card>

      <Card
        title="Günlük teklifler"
        action={
          <span className="store__remaining">
            Kalan süre: {formatRemaining(daily.expiresAt, now)}
          </span>
        }
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
      </Card>

      <Card
        title="Gece pazarı"
        action={
          nightMarket ? (
            <span className="store__remaining">
              Kalan süre: {formatRemaining(nightMarket.expiresAt, now)}
            </span>
          ) : undefined
        }
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
      </Card>
    </div>
  );
}
