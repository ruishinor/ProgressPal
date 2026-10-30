import type { MicroSession, MicroSource } from '@/lib/domain';

// EDU-04. Original, independent activities; formal content acceptance pending.
const source = (activity: string): MicroSource => ({
  moduleId: 'tenk-som-en-utvikler',
  lessonUnitIds: [activity],
  skillIds: ['SK-METH-01'],
});

export const teknologiSessions: readonly MicroSession[] = [
  {
    id: 'tsu-tek-01',
    title: 'Hva gjør de ulike delene?',
    summary: 'Skill språk, kjøremiljø og bibliotek.',
    minutes: 3,
    takeaway:
      'Skill språk, kjøremiljø og UI-bibliotek. Velg delene siden trenger.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-tek-01-forklart',
        title: 'Kode trenger et sted å kjøre',
        role: 'explain',
        source: source('TEK-01'),
        idea: 'Ada lager ungdomshusets nettside. HTML beskriver innholdet, CSS utseendet og programmeringsspråket JavaScript handlingene. Et kjøremiljø, runtime, kjører kode: nettleseren kjører sidens JavaScript; Node.js kjører JavaScript utenfor nettleseren.',
        bridge: 'Neste: Se hvordan delene brukes.',
      },
      {
        kind: 'learn',
        id: 'tsu-tek-01-eksempel',
        title: 'React bygger grensesnittet',
        role: 'explain',
        source: source('TEK-01'),
        idea: 'Et bibliotek er kode programmet bruker. React er et bibliotek for brukergrensesnitt (UI), bygd av gjenbrukbare deler, komponenter. Språk og kjøremiljø trengs fortsatt.',
        bridge: 'Neste: Finn hvilken del som kan oppdatere listen.',
      },
      {
        kind: 'select',
        id: 'tsu-tek-01-valg',
        title: 'Listen endrer seg ikke',
        role: 'scaffold',
        source: source('TEK-01'),
        context:
          'Adas React-liste viser gamle verdier etter et valg. Nettleseren kjører JavaScript uten feil.',
        question: 'Hva bør hun undersøke først?',
        options: [
          {
            id: 'runtime',
            label: 'Bytte nettleseren med Node.js.',
            feedback:
              'Nettleseren kjører allerede koden. Å bytte kjøremiljø retter ikke koblingen til listen.',
          },
          { id: 'ui', label: 'Hvordan valget oppdaterer dataene React viser.' },
          {
            id: 'sprak',
            label: 'Erstatte JavaScript med React som språk.',
            feedback:
              'React er et bibliotek brukt fra JavaScript, ikke et annet programmeringsspråk.',
          },
        ],
        correctId: 'ui',
        hint: 'Følg forbindelsen fra valg til visning.',
        explanation:
          'Følg valget fram til dataene komponenten viser. Koden kan kjøre uten å oppdatere riktig verdi.',
      },
      {
        kind: 'select',
        id: 'tsu-tek-01-overfor',
        title: 'Ny situasjon: bare åpningstider',
        role: 'application',
        source: source('TEK-01'),
        context:
          'Bo kan HTML, CSS og JavaScript. Siden skal vise åpningstider og en veibeskrivelse ved knappetrykk. Ingen innlogging eller deling trengs.',
        question: 'Hva er et rimelig utgangspunkt?',
        options: [
          { id: 'enkelt', label: 'Bruke HTML, CSS og litt JavaScript.' },
          {
            id: 'react',
            label: 'Velge React fordi en knapp krever komponenter.',
            feedback:
              'Nettleseren har knapper. Denne knappen begrunner ikke mer oppsett alene.',
          },
          {
            id: 'node',
            label: 'Legge knappehandlingen i Node.js hos hver besøkende.',
            feedback:
              'Handlingen skjer i nettleseren. Besøkende trenger ikke Node.js.',
          },
        ],
        correctId: 'enkelt',
        hint: 'Hva mangler nettleseren her?',
        explanation:
          'Dette dekker behovet. Flere sammenkoblede visninger kan senere gjøre et UI-bibliotek nyttig.',
      },
    ],
  },
  {
    id: 'tsu-tek-02',
    title: 'Fra utvikling til publisering',
    summary: 'Forklar hva Vite gjør, og hva et bygg ikke løser.',
    minutes: 3,
    takeaway:
      'Bygging klargjør filer; publisering gjør dem tilgjengelige. Test også løsningen i drift.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-tek-02-forklart',
        title: 'Vite hjelper utvikleren',
        role: 'explain',
        source: source('TEK-02'),
        idea: 'Ada bruker React-biblioteket til brukergrensesnittet og Vite til utvikling og bygging. Vites utviklingsserver viser endringer lokalt. En bundler samler og bearbeider egen kode og kode den bruker; byggkommandoen lager filer for publisering.',
        bridge: 'Neste: Se hvordan delene brukes.',
      },
      {
        kind: 'learn',
        id: 'tsu-tek-02-eksempel',
        title: 'Ferdige filer skal i drift',
        role: 'explain',
        source: source('TEK-02'),
        idea: 'Deployment betyr å legge løsningen i drift. En statisk vert leverer ferdige filer til nettleseren. Vite lager ikke database eller innlogging. Utviklingsserveren og den lokale forhåndsvisningen er ikke produksjonsservere.',
        bridge: 'Neste: Finn trinnet som mangler.',
      },
      {
        kind: 'select',
        id: 'tsu-tek-02-valg',
        title: 'Bygget er ferdig, men siden mangler',
        role: 'scaffold',
        source: source('TEK-02'),
        context:
          'Vite bygger uten feil. Filene ligger bare hos Ada. Ungdomshusets nettadresse viser den gamle siden.',
        question: 'Hvilket trinn mangler?',
        options: [
          {
            id: 'react',
            label: 'Bytte React med et annet grensesnittverktøy.',
            feedback: 'Byttet publiserer ikke filene.',
          },
          {
            id: 'dev',
            label: 'La besøkende koble seg til utviklingsserveren.',
            feedback:
              'Utviklingsserveren er for lokalt arbeid, ikke produksjonsdrift.',
          },
          { id: 'publiser', label: 'Publisere de ferdige filene til verten.' },
        ],
        correctId: 'publiser',
        hint: 'Hvor hentes filene på nettadressen?',
        explanation:
          'Publiser filene. Kontroller så at adressen leverer riktig utgave og at viktige handlinger virker.',
      },
      {
        kind: 'select',
        id: 'tsu-tek-02-overfor',
        title: 'Ny situasjon: Vue bygger uten feil',
        role: 'application',
        source: source('TEK-02'),
        context:
          'Bo bruker Vue, et rammeverk for brukergrensesnitt, sammen med Vite. Den publiserte siden åpnes, men lagring feiler når tjenesten som mottar data, er utilgjengelig.',
        question: 'Hva forteller det vellykkede bygget?',
        options: [
          {
            id: 'lagring',
            label: 'At dataene blir lagret selv om tjenesten er nede.',
            feedback:
              'Bygging verken lagrer brukerdata eller holder tjenesten tilgjengelig.',
          },
          {
            id: 'filer',
            label: 'At filene kunne bygges, ikke at lagringen virker.',
          },
          {
            id: 'vue',
            label: 'At Vue overtar lagringen når tjenesten svikter.',
            feedback: 'Rammeverket overtar ikke tjenestens ansvar.',
          },
        ],
        correctId: 'filer',
        hint: 'Hva prøver byggkommandoen faktisk?',
        explanation:
          'Bo må teste forbindelsen og håndtere lagringsfeil. Skillet gjelder både React og Vue.',
      },
    ],
  },
  {
    id: 'tsu-tek-03',
    title: 'Hvem har ansvar for dataene?',
    summary: 'Følg en forespørsel fra nettleser via API til database.',
    minutes: 4,
    takeaway:
      'Frontend viser. Backend kontrollerer forespørsler; databasen lagrer. API-et er grensesnittet mellom delene.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-tek-03-forklart',
        title: 'En påmelding krysser flere deler',
        role: 'explain',
        source: source('TEK-03'),
        idea: 'Ada og Bo lager delte påmeldinger. Frontend er delen brukeren møter i nettleseren. Backend behandler forespørsler på en server. Et API er et avtalt grensesnitt mellom programmer, her «registrer påmeldingen». Databasen lagrer opplysningene.',
        bridge: 'Neste: Se hvordan delene brukes.',
      },
      {
        kind: 'learn',
        id: 'tsu-tek-03-eksempel',
        title: 'Express bruker Node.js',
        role: 'explain',
        source: source('TEK-03'),
        idea: 'Node.js er et kjøremiljø for JavaScript utenfor nettleseren. Backend-rammeverket Express gir struktur og verktøy for forespørsler i Node.js; teamet skriver reglene. MySQL er databasesystemet i eksemplet.',
        bridge: 'Neste: Avgjør hvor påmeldingen må kontrolleres.',
      },
      {
        kind: 'select',
        id: 'tsu-tek-03-valg',
        title: 'En forespørsel går utenom skjemaet',
        role: 'scaffold',
        source: source('TEK-03'),
        context:
          'React-skjemaet hindrer påmelding til fulle arrangementer. Noen sender likevel en forespørsel direkte til API-et. Backend avgjør om en plass kan tildeles.',
        question: 'Hvor må regelen håndheves for alle forespørsler?',
        options: [
          { id: 'backend', label: 'I backend, før påmeldingen godtas.' },
          {
            id: 'knapp',
            label: 'Bare i React-knappen som skjules når det er fullt.',
            feedback: 'Forespørselen bruker ikke knappen. Skjemaet kan omgås.',
          },
          {
            id: 'vite',
            label: 'I Vite når nettstedet bygges.',
            feedback: 'Bygging behandler ikke nye påmeldinger.',
          },
        ],
        correctId: 'backend',
        hint: 'Hvem mottar også forespørsler utenom skjemaet?',
        explanation:
          'Backend må kontrollere forespørselen. Databasen kan også håndheve regler. Samtidige påmeldinger krever samordnet kontroll og lagring.',
      },
      {
        kind: 'select',
        id: 'tsu-tek-03-overfor',
        title: 'Ny situasjon: en personlig huskeliste',
        role: 'application',
        source: source('TEK-03'),
        context:
          'Minas huskeliste brukes på én enhet uten konto, deling eller sentral tjeneste. Hun godtar at nettleserlagring kan slettes.',
        question: 'Hvilken løsning passer de oppgitte kravene?',
        options: [
          {
            id: 'alltid',
            label: 'Legge til Express; alle nettsider trenger backend.',
            feedback: 'Kravene trenger ingen sentral tjeneste.',
          },
          {
            id: 'vite-db',
            label: 'Bruke Vite som database for listen.',
            feedback: 'Vite er et utviklingsverktøy, ikke varig lagring.',
          },
          { id: 'lokalt', label: 'Lagre listen lokalt i nettleseren.' },
        ],
        correctId: 'lokalt',
        hint: 'Trengs en felles datakilde?',
        explanation:
          'Lokal lagring dekker kravene. Deling eller gjenoppretting på en annen enhet ville krevd nye tiltak.',
      },
    ],
  },
  {
    id: 'tsu-tek-04',
    title: 'Velg UI-verktøy ut fra behov',
    summary: 'Sammenlign React, Vue og Angular uten en universell vinner.',
    minutes: 4,
    takeaway:
      'Vurder verktøyets omfang, teamkunnskap og vedlikehold. Ingen av navnene avgjør valget alene.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-tek-04-forklart',
        title: 'Ulikt omfang, flere mulige løsninger',
        role: 'explain',
        source: source('TEK-04'),
        idea: 'UI betyr brukergrensesnitt. React er et UI-bibliotek med gjenbrukbare deler (komponenter). Teamet velger andre deler selv. Et rammeverk gir struktur og avtalte måter å bygge på.',
        bridge: 'Neste: Se hvordan delene brukes.',
      },
      {
        kind: 'learn',
        id: 'tsu-tek-04-eksempel',
        title: 'Vue og Angular gir ulik struktur',
        role: 'explain',
        source: source('TEK-04'),
        idea: 'Vue er et progressivt UI-rammeverk: for én del av en HTML-side eller en hel app. Angular er et mer samlet webrammeverk med skjemaer og ruting, valg av visning ut fra nettadressen. Det bygger på TypeScript, JavaScript med typer. Omfanget avgjør ikke hva som er best.',
        bridge: 'Neste: Forbedre ett skjema.',
      },
      {
        kind: 'select',
        id: 'tsu-tek-04-valg',
        title: 'Ett skjema trenger bedre samspill',
        role: 'scaffold',
        source: source('TEK-04'),
        context:
          'Bo skal forbedre ett komplisert skjema på en ellers fungerende HTML-side. Teamet kjenner Vue og ønsker å beholde resten av siden. Ingen andre behov krever et nytt rammeverk.',
        question: 'Hvilket forslag har best støtte i premissene?',
        options: [
          {
            id: 'angular',
            label: 'Omskrive siden i Angular for å samle skjemaverktøyene.',
            feedback: 'Oppgaven begrunner ikke full omskriving og opplæring.',
          },
          { id: 'vue', label: 'Prøve Vue på skjemaet og beholde resten.' },
          {
            id: 'react',
            label: 'Bytte til React og velge skjemaverktøy på nytt.',
            feedback:
              'Det kan fungere, men krever opplæring og nye valg uten et dokumentert behov her.',
          },
        ],
        correctId: 'vue',
        hint: 'Se både på hva som skal endres, og hva teamet allerede kan.',
        explanation:
          'Vue passer teamkunnskapen og ønsket om å bevare siden. React kunne også løst oppgaven.',
      },
      {
        kind: 'select',
        id: 'tsu-tek-04-overfor',
        title: 'Ny situasjon: teamet kan Angular',
        role: 'application',
        source: source('TEK-04'),
        context:
          'Minas Angular-app dekker behovene og støttes fortsatt. Teamet behersker den. En kollega vil bytte til et mer omtalt verktøy.',
        question: 'Hva er den sterkeste vurderingen før et bytte?',
        options: [
          {
            id: 'behov',
            label: 'Kreve en gevinst som forsvarer omskriving og opplæring.',
          },
          {
            id: 'popularitet',
            label: 'Følge populariteten; den beviser best vedlikehold.',
            feedback:
              'Undersøk økosystemet: tilgjengelige biblioteker, dokumentasjon og støtte. Omtale beviser ikke nytten her.',
          },
          {
            id: 'aldri',
            label: 'Aldri bytte; teamet kan allerede Angular.',
            feedback: 'Nye krav eller opphørt støtte kan begrunne et bytte.',
          },
        ],
        correctId: 'behov',
        hint: 'Hva sier noe om nytten her?',
        explanation:
          'Sammenlign gevinst, overgangskostnad og vedlikehold. Popularitet gjelder en bestemt tid og gruppe; krav og ansvarsdeling er mer varige holdepunkter.',
      },
    ],
  },
  {
    id: 'tsu-tek-05',
    title: 'Sett sammen en løsning',
    summary: 'Vurder React+Vite opp mot et integrert fullstack-rammeverk.',
    minutes: 4,
    takeaway:
      'Et fullstack-rammeverk samler flere deler. Teamet må fortsatt planlegge regler, lagring, testing og drift.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-tek-05-forklart',
        title: 'Samlet rammeverk eller separate deler?',
        role: 'explain',
        source: source('TEK-05'),
        idea: 'En stack er teknologikombinasjonen i en løsning. React+Vite gir bibliotek for brukergrensesnitt og utviklings-/byggverktøy. En backend, serverdelen, velges ved behov. Et API er grensesnittet til en annen tjeneste.',
        bridge: 'Neste: Se hvordan delene brukes.',
      },
      {
        kind: 'learn',
        id: 'tsu-tek-05-eksempel',
        title: 'Next.js samler flere deler',
        role: 'explain',
        source: source('TEK-05'),
        idea: 'Fullstack-rammeverket Next.js bygger på React. Det samler frontend (brukergrensesnitt), ruting mellom sider og serverfunksjoner. Det kan lage HTML, nettleserens sideformat, på serveren. Serverfunksjoner trenger serverdrift; en eksport med bare statiske filer kan ikke utføre dem. Teamet lager fortsatt databaseregler og tester kravene.',
        bridge: 'Neste: Velg en kombinasjon.',
      },
      {
        kind: 'select',
        id: 'tsu-tek-05-valg',
        title: 'Offentlige sider og påmeldinger',
        role: 'scaffold',
        source: source('TEK-05'),
        context:
          'Ada trenger offentlige arrangementssider levert som HTML, og serverbehandling av påmeldinger. Teamet kan React, har ingen backend og vil samle ruting og serverkode i ett prosjekt.',
        question: 'Hvilket forslag passer best til disse ønskene?',
        options: [
          {
            id: 'vite',
            label: 'La React+Vites byggekommando behandle påmeldingene.',
            feedback: 'Byggekommandoen behandler ikke nye påmeldinger.',
          },
          {
            id: 'automatisk',
            label: 'Velge Next.js; påmeldingsreglene følger ferdige med.',
            feedback: 'Teamet må fortsatt lage og teste påmeldingsreglene.',
          },
          {
            id: 'next',
            label: 'Vurdere Next.js og planlegge datalagring og serverdrift.',
          },
        ],
        correctId: 'next',
        hint: 'Skill samlet prosjekt fra ferdige påmeldingsregler.',
        explanation:
          'Next.js passer ønsket om et samlet prosjekt. Separat backend kan også fungere, med annen samordning av utvikling og drift.',
      },
      {
        kind: 'select',
        id: 'tsu-tek-05-overfor',
        title: 'Ny situasjon: API-et finnes allerede',
        role: 'application',
        source: source('TEK-05'),
        context:
          'Bos interne grensesnitt bruker et vedlikeholdt API for tilgang og lagring. Teamet kan React+Vite og trenger ingen nye serverfunksjoner eller HTML laget på serveren.',
        question: 'Hva er best begrunnet nå?',
        options: [
          {
            id: 'behold',
            label: 'Bruke React+Vite mot det eksisterende API-et.',
          },
          {
            id: 'dobbel',
            label: 'Lage ny backend for å kunne kalle løsningen fullstack.',
            feedback: 'Det gir mer drift uten å dekke et manglende behov.',
          },
          {
            id: 'erstatt',
            label: 'Erstatte API-et; fullstack-rammeverk må eie databasen.',
            feedback:
              'Fullstack-rammeverk kan også bruke eksisterende tjenester.',
          },
        ],
        correctId: 'behold',
        hint: 'Hvilke oppgaver er allerede løst?',
        explanation:
          'Kombinasjonen dekker kravene. Et integrert rammeverk kan passe andre behov, men er ingen automatisk forbedring her.',
      },
    ],
  },
];
