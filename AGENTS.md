<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep roster statistics derived from the existing roster query results, never separate requests; this preserves the shared backend's data-access paths.
- Load UI and statistic fonts through root head stylesheet links and expose them as global semantic font tokens; this avoids remote CSS imports and limits display typography to explicit statistic usage.
