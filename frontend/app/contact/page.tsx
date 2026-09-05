import { contactMetadata, renderContact } from './renderContact';

export const metadata = contactMetadata('en');

export default function ContactPage() {
    return renderContact('en');
}
