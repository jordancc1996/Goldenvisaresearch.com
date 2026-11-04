# Golden Visa Research

## Article inquiry form

Every news article, research report, program article, and press release includes one inquiry form. The shared article pipeline inserts it. Do not paste the form into a Markdown or MDX file.

The approved design reference is `public/references/article-cta-reference.png`. Use that card layout with this site's ink, hairline, and accent blue. Do not change the design without explicit approval.

The form asks for an email address, a LinkedIn profile URL, and one program. It does not add the address to a newsletter list. The submit control says "Explore Your Options" and uses the forest-green Subscribe button from `public/references/article-cta-reference.png`. Program choices live in `src/data/inquiry-programs.ts`. The selected program comes from `inquiryProgram` when that field is set. Otherwise it comes from the single country on the record. Portugal, a comparison, and an article about more than one country stay on Other / Not Sure Yet.

The form is placed after the third top-level paragraph when the article has at least six paragraphs, and at the end of the body when it is shorter. Do not set `newsletter: false` on a published article.

Submissions are not stored until `INQUIRY_FORM_ENDPOINT` is an approved https form endpoint. Do not invent an endpoint. Do not show a success message unless that endpoint accepts the submission.
