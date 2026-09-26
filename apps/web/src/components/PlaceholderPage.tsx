interface PlaceholderPageProps { icon: string; title: string; description: string; badge?: string; }
export function PlaceholderPage({ icon, title, description, badge }: PlaceholderPageProps) {
  return (<div className="container"><div className="page-placeholder"><div className="page-placeholder-icon">{icon}</div><h2>{title}</h2><p>{description}</p>{badge && <span className="badge badge-info">{badge}</span>}</div></div>);
}
