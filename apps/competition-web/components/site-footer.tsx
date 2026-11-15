import { SiteFooter as EnigmicFooter } from "@enigmic-co/ui/SiteFooter";

/**
 * Non-affiliation notice, as card-web's footer (styling guide, "Footer"). The
 * game logos are covered by D-054.
 */
export function SiteFooter() {
  return (
    <EnigmicFooter>
      <p>
        <strong className="font-medium text-foreground">Enigmic League</strong> is an
        unofficial, community-run site. It is not affiliated with, endorsed, sponsored or
        approved by Konami.
      </p>
      <p>
        Yu-Gi-Oh!, Master Duel and their names and logos are trademarks and copyrights of
        Konami Digital Entertainment and their respective owners.
      </p>
    </EnigmicFooter>
  );
}
