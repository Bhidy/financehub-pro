import { contactMetadata, renderContact } from '@/app/contact/renderContact';

/** Arabic twin of /contact — it returned 404 while /ar/editorial-policy and
 *  /ar/corrections both existed, leaving an Arabic hole in the trust cluster. */
export const metadata = contactMetadata('ar');

export default function ContactArPage() {
    return renderContact('ar');
}
