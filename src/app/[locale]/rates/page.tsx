import { redirect } from "next/navigation";

export default function RatesPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/settings`);
}
