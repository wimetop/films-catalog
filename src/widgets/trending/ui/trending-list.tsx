"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTrendingItems } from "@/entities/trending/api/client";
import { trendingKeys } from "@/entities/trending/model/query-keys";
import { ItemCard } from "@/entities/item/ui/item-card";

export function TrendingList() {
  const { data = [] } = useQuery({ queryKey: trendingKeys.all, queryFn: fetchTrendingItems });
  if (data.length === 0) return null;
  return <section aria-labelledby="trending-title"><div className="section-heading"><div><p className="eyebrow">Популярне</p><h2 id="trending-title">Trending now</h2></div></div><div className="film-grid">{data.map((item) => <ItemCard key={item.id} item={item} />)}</div></section>;
}
