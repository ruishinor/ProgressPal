import type { MicroSession } from '@/lib/domain';

// Educational remediation proposal, 2026-10-27. Independent acceptance pending.
export const sqlMysqlSessions: readonly MicroSession[] = [
  {
    id: 'tsu-sql-01',
    title: 'Hvordan henger data sammen?',
    summary: 'Finn riktig person ved å følge en lagret referanse.',
    minutes: 6,
    takeaway:
      'En rad trenger en entydig identitet. En fremmednøkkel lagrer hvem eller hva raden hører til. Følg denne referansen; like navn og radplass er ikke nok.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-sql-01-ide',
        title: 'Hvem har meldt seg på?',
        role: 'explain',
        idea: 'Et ungdomshus trenger oversikt over deltakere og påmeldingene deres til verksteder. En database lagrer opplysninger slik at appen kan finne og endre dem. MySQL er et databasesystem; SQL er språket appen bruker for å be det om noe.\nEn tabell samler opplysninger om én type ting. I tabellen deltakere er hver rad én person. Kolonnene id, navn og alder forteller hva hvert felt betyr. To personer kan hete Ada, så navnet alene er ikke nok til å finne riktig person.',
        bridge: 'Neste: Se hvordan en påmelding peker på én bestemt deltaker.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-01'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'learn',
        id: 'tsu-sql-01-kobling',
        title: 'To ulike ID-er',
        role: 'explain',
        idea: 'En primærnøkkel er en verdi som identifiserer én rad, uten duplikater eller manglende verdi. I deltakere er kolonnen id primærnøkkelen.\nPåmeldingene ligger i en egen tabell, pameldinger. Hver påmelding har sin egen id. Kolonnen deltaker_id lagrer ID-en til personen som meldte seg på. Dette er en fremmednøkkel (foreign key) som viser til deltakere.id. Flere påmeldinger kan vise til samme person.\nNotasjonen deltakere.id betyr «kolonnen id i tabellen deltakere». Påmeldingens id og deltakerens id identifiserer ulike ting.',
        bridge:
          'Neste: Bruk deltaker_id for å finne personen bak påmelding 102.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-01'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-sql-01-nokkel',
        title: 'Hvem hører påmelding 102 til?',
        role: 'scaffold',
        context:
          'Ungdomshusets tabell deltakere har kolonnene id, navn og alder:\n1: Ada, 17 år. 2: Bo, 20 år.\n3: Ada, 22 år. 4: Dina, 30 år.\nI tabellen pameldinger har påmelding 102 verdien 1 i deltaker_id. Denne kolonnen viser til deltakere.id.',
        question: 'Hvilken deltaker tilhører påmelding 102?',
        options: [
          {
            id: 'begge',
            label: 'Begge som heter Ada.',
            feedback:
              'Navnet er likt, men ID-ene er forskjellige. Referansen inneholder 1, så den peker ikke på Ada med ID 3.',
          },
          {
            id: 'en',
            label: 'Ada med ID 1.',
          },
          {
            id: 'to',
            label: 'Bo med ID 2.',
            feedback:
              '102 er nummeret på påmeldingen, ikke en deltaker-ID. Verdien som viser hvem påmeldingen gjelder, står i deltaker_id og er 1.',
          },
        ],
        correctId: 'en',
        hint: 'Finn verdien i deltaker_id, og finn så raden med samme id i deltakere.',
        explanation:
          'deltaker_id er 1. Raden med id 1 er Ada på 17 år. Påmelding 102 kan dermed knyttes til riktig Ada selv om navnet ikke er unikt.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-01'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'learn',
        id: 'tsu-sql-01-regel',
        title: 'En referanse må kunne følges',
        role: 'explain',
        idea: 'Utvikleren kan også be MySQL kontrollere koblingen. En FOREIGN KEY-regel, altså en fremmednøkkelregel, krever her at deltaker_id viser til en deltaker som finnes.\nRegelen lager ikke en ny deltaker hvis ID-en mangler. Den avviser påmeldingen. Det hindrer at ungdomshuset får en påmelding som ingen kan knytte til en registrert person.',
        bridge:
          'Neste: Hva skjer hvis en påmelding viser til en ukjent deltaker?',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-01'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-sql-01-relasjon',
        title: 'Kan vi registrere deltaker 9?',
        role: 'retrieval',
        context:
          'I ungdomshusets database finnes bare deltakere med id 1, 2, 3 og 4. pameldinger.deltaker_id viser til deltakere.id. Tabellene bruker InnoDB, MySQLs lagringsmotor, og fremmednøkkelregelen er slått på.',
        question:
          'Appen prøver å lagre en påmelding med deltaker_id 9. Hva skjer?',
        options: [
          {
            id: 'lager',
            label: 'MySQL oppretter først en deltaker med id 9.',
            feedback:
              'En fremmednøkkelregel kontrollerer referansen, men har ingen opplysninger om en ny person og lager ikke en deltakerrad.',
          },
          {
            id: 'avvist',
            label: 'Påmeldingen avvises fordi deltaker 9 mangler.',
          },
          {
            id: 'fri',
            label: 'MySQL erstatter 9 med en eksisterende deltaker-ID.',
            feedback:
              'Regelen skal beskytte koblingen, ikke gjette hvem påmeldingen gjelder. Å bytte ID ville knyttet den til feil person.',
          },
        ],
        correctId: 'avvist',
        hint: 'Finnes det en deltakerrad som denne referansen kan vise til?',
        explanation:
          'Ingen rad har id 9, så koblingen kan ikke godtas. Hvis dette er en ny person, må appen først registrere personen og så bruke personens faktiske ID i påmeldingen.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-01'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-sql-01-overfor',
        title: 'Ny situasjon: delte telefonnumre',
        role: 'application',
        context:
          'En nettbutikk lagrer kunder og ordre i hver sin tabell. Hver kunde har en unik kunde_id. To kunder deler telefonnummer, og én kunde kan bestille flere ganger. Hver ordre har sin egen ordre_id.',
        question:
          'Hvilken opplysning bør en ordre vise til for å identifisere kunden entydig?',
        options: [
          {
            id: 'telefon',
            label: 'Kundens telefonnummer.',
            feedback:
              'To kunder deler nummeret. Da kan ikke telefonnummeret avgjøre hvilken av dem ordren tilhører.',
          },
          {
            id: 'ordre',
            label: 'Bare ordrens egen ordre_id.',
            feedback:
              'Ordrenummeret skiller ordrene fra hverandre, men forteller ikke hvilken kunde som bestilte.',
          },
          {
            id: 'kunde',
            label: 'Kundens kunde_id som fremmednøkkel.',
          },
        ],
        correctId: 'kunde',
        hint: 'Hvilken verdi skiller de to kundene selv om de deler telefon?',
        explanation:
          'kunde_id peker på én bestemt kunde. To ordre kan ha forskjellige ordre_id og likevel samme kunde_id. Slik kan butikken finne alle ordrene til én kunde uten å forveksle kunder med like kontaktopplysninger.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-01'],
          skillIds: ['SK-SQL-01'],
        },
      },
    ],
  },
  {
    id: 'tsu-sql-02',
    title: 'Finn riktig informasjon',
    summary: 'Oversett et behov til vilkår, og følg hvilke rader som blir med.',
    minutes: 6,
    takeaway:
      'Bestem først hvilke opplysninger og personer du trenger. SELECT velger kolonner; WHERE avgrenser rader. AND krever begge vilkår. Sortering og antallsgrense avgjør hvilke treff som vises først.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-sql-02-ide',
        title: 'Et spørsmål til deltakerlisten',
        role: 'explain',
        idea: 'Et ungdomshus lagrer deltakere i en database. I tabellen deltakere er hver rad én person; kolonnene id, navn og alder er opplysninger om personen. SQL er språket for å be databasen om data. Her bruker vi MySQL 8.4.\nSELECT navn betyr at svaret skal vise kolonnen navn. FROM deltakere sier hvilken tabell opplysningene hentes fra. WHERE velger radene som oppfyller et vilkår. >= betyr større enn eller lik.',
        example: {
          code: 'SELECT navn\nFROM deltakere\nWHERE alder >= 18;',
          note: 'Ada på 17 blir ikke med; Bo på 20 blir med.',
        },
        bridge: 'Neste: Bruk to grenser for å finne et aldersintervall.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-02'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'learn',
        id: 'tsu-sql-02-vilkar',
        title: 'Begge grensene må gjelde',
        role: 'explain',
        idea: 'Ungdomshuset vil kontakte deltakere fra 18 til og med 25 år. alder >= 18 tar bort dem under 18. alder <= 25 tar bort dem over 25. AND betyr at begge må stemme for samme rad.\nOR betyr at minst ett vilkår er nok. En 30-åring oppfyller «minst 18» og blir derfor med hvis grensene kobles med OR.\nORDER BY alder ASC sorterer treffene fra lavest til høyest alder. Uten ORDER BY er rekkefølgen ikke garantert. Semikolonet avslutter kommandoen i eksemplene.',
        bridge:
          'Neste: Bygg spørringen som finner navnene innenfor begge grenser.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-02'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'assemble',
        id: 'tsu-sql-02-bygg',
        title: 'Bygg aldersfilteret',
        role: 'scaffold',
        context:
          'Ungdomshuset lagrer én rad per deltaker i deltakere (id, navn, alder):\n1: Ada, 17 år. 2: Bo, 20 år.\n3: Ada, 22 år. 4: Dina, 30 år.',
        question:
          'Hent bare navn på deltakere fra 18 til og med 25 år, yngst først. Velg de ferdige delene i SQL-rekkefølge. Én del skal ikke brukes.',
        tokens: [
          {
            id: 'sorter',
            text: 'ORDER BY alder ASC;',
          },
          {
            id: 'eller',
            text: 'WHERE alder >= 18 OR alder <= 25',
          },
          {
            id: 'fra',
            text: 'FROM deltakere',
          },
          {
            id: 'navn',
            text: 'SELECT navn',
          },
          {
            id: 'og',
            text: 'WHERE alder >= 18 AND alder <= 25',
          },
        ],
        correctOrder: ['navn', 'fra', 'og', 'sorter'],
        hint: 'Prøv grensene på både Ada på 17 og Dina på 30. Skal noen av dem være med?',
        explanation:
          'SELECT navn FROM deltakere velger opplysningen og tabellen. AND beholder Bo på 20 og Ada på 22; ASC gir Bo først. OR ville tatt med alle fire: Hver person oppfyller minst én av grensene. En annen rekkefølge på SQL-delene gir ikke kommandoen som er lært.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-02'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'learn',
        id: 'tsu-sql-02-sortering',
        title: 'Hvilke treff kommer først?',
        role: 'explain',
        idea: 'ORDER BY alder DESC sorterer fra høyest til lavest alder; DESC er motsatt av ASC. LIMIT 2 beholder de to første treffene etter sorteringen.\nEksempel: Aldrene 21, 24 og 35 sorteres til 35, 24, 21. Med LIMIT 2 blir bare 35 og 24 med.',
        bridge: 'Neste: Finn navnene som en slik spørring gir.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-02'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-sql-02-resultat',
        title: 'Hvilke navn kommer ut?',
        role: 'retrieval',
        context:
          'Ungdomshuset lagrer én rad per deltaker i deltakere (id, navn, alder):\n1: Ada, 17 år. 2: Bo, 20 år.\n3: Ada, 22 år. 4: Dina, 30 år.',
        code: 'SELECT navn\nFROM deltakere\nWHERE alder >= 20\nORDER BY alder DESC\nLIMIT 2;',
        question:
          'Teamet vil se de to eldste deltakerne som er minst 20 år. Hva gir spørringen, i rekkefølge?',
        options: [
          {
            id: 'yngst',
            label: 'Bo, Ada',
            feedback:
              'Dette begynner med den yngste som passer filteret. DESC gjør det motsatte: høyeste alder kommer først.',
          },
          {
            id: 'eldst',
            label: 'Dina, Ada',
          },
          {
            id: 'tre',
            label: 'Dina, Ada, Bo',
            feedback:
              'Alle tre passer aldersvilkåret, men LIMIT 2 begrenser svaret til de to første etter sortering.',
          },
        ],
        correctId: 'eldst',
        hint: 'Finn først radene som passer alderen, og bruk så sorteringen og antallsgrensen.',
        explanation:
          'Filteret beholder Bo (20), Ada (22) og Dina (30). DESC plasserer Dina først og Ada som nummer to. LIMIT 2 tar bort Bo fra svaret. Aldrene er forskjellige her, så det er ingen uavklart lik rekkefølge.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-02'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-sql-02-overfor',
        title: 'Ny situasjon: ledige bøker',
        role: 'application',
        context:
          'Bibliotekets tabell boker har én rad per bok. id er bokas nummer, ledig er 1 når den kan lånes og 0 når den er utlånt, og sider er antall boksider.\nBok 11: ledig 1, sider 90.\nBok 12: ledig 0, sider 60.\nBok 13: ledig 1, sider 150.',
        question:
          'En låner vil ha en ledig bok med under 100 sider. Hvilket filter passer etter SELECT id FROM boker?',
        options: [
          {
            id: 'og',
            label: 'WHERE ledig = 1 AND sider < 100;',
          },
          {
            id: 'eller',
            label: 'WHERE ledig = 1 OR sider < 100;',
            feedback:
              'Bok 12 er kort, men utlånt. Bok 13 er ledig, men for lang. OR tar med begge, fordi ett vilkår er nok.',
          },
          {
            id: 'stor',
            label: 'WHERE ledig = 1 AND sider > 100;',
            feedback:
              'Dette velger en ledig bok med mer enn 100 sider: bok 13. Låneren ba om under 100.',
          },
        ],
        correctId: 'og',
        hint: 'Sammenlign hver bok med begge ønskene, ikke bare ett av dem.',
        explanation:
          'Bare bok 11 er både ledig og kort nok. De to vilkårene gjelder samme bokrad, akkurat som begge aldersgrensene gjaldt samme deltaker.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-02'],
          skillIds: ['SK-SQL-01'],
        },
      },
    ],
  },
  {
    id: 'tsu-sql-03',
    title: 'Legg til og endre data',
    summary: 'Finn nøyaktig hvilke rader en endring vil treffe.',
    minutes: 6,
    takeaway:
      'Velg målradene før du endrer data. Samme WHERE kan brukes i SELECT for å kontrollere utvalget. Skill mellom rader som passer filteret og rader som faktisk får en ny verdi. En forhåndskontroll beskytter ikke mot samtidige endringer.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-sql-03-ide',
        title: 'Nye rader og nye verdier',
        role: 'explain',
        idea: 'Et ungdomshus lagrer påmeldinger til verksteder. Hver rad i tabellen pameldinger er én påmelding. id er et unikt påmeldingsnummer. deltaker_id viser personen, aktivitet er verkstedet, og status er ja for bekreftet eller nei for ikke bekreftet.\nSQL er språket for å endre og hente data. INSERT INTO legger til en ny rad; VALUES gir verdiene i samme rekkefølge som kolonnene. UPDATE endrer eksisterende rader, og SET sier hvilken verdi de skal få. DELETE FROM fjerner rader.',
        example: {
          code: "INSERT INTO pameldinger\n  (id, deltaker_id, aktivitet, status)\nVALUES (104, 3, 'Web', 'ja');",
          note: 'Dette legger til påmelding 104 for deltaker 3. Tekst som Web og ja står i enkle anførselstegn; tallene er ID-er.',
        },
        bridge: 'Neste: Avgrens en endring til én bestemt påmelding.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-03'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'learn',
        id: 'tsu-sql-03-avgrens',
        title: 'Hvilke rader gjelder endringen?',
        role: 'explain',
        idea: 'WHERE er vilkåret som bestemmer hvilke rader UPDATE eller DELETE gjelder. WHERE id = 102 betyr raden med påmeldingsnummer 102. WHERE deltaker_id = 1 betyr alle påmeldinger for person 1. Det kan være flere.\nEn utvikler kan først undersøke utvalget med SELECT og samme WHERE. SELECT * FROM pameldinger viser alle kolonnene i de valgte radene, uten å endre dem. Kontroller at utvalget er riktig før endringen, og kontroller resultatet etterpå.',
        bridge: 'Neste: Bygg en endring som gjelder bare påmelding 102.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-03'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'assemble',
        id: 'tsu-sql-03-bygg',
        title: 'Endre bare påmelding 102',
        role: 'scaffold',
        context:
          'Ungdomshusets tabell pameldinger har én rad per påmelding. id identifiserer påmeldingen; deltaker_id viser hvem den gjelder. status er ja for bekreftet og nei for ikke bekreftet.\n(id, deltaker_id, aktivitet, status):\n101: 1, SQL, ja.\n102: 1, Web, nei.\n103: 2, SQL, ja.',
        question:
          'Sett status til ja på bare påmelding 102. Velg SQL-delene i riktig rekkefølge; én del er for bred.',
        tokens: [
          {
            id: 'bred',
            text: 'WHERE deltaker_id = 1;',
          },
          {
            id: 'sett',
            text: "SET status = 'ja'",
          },
          {
            id: 'tabell',
            text: 'UPDATE pameldinger',
          },
          {
            id: 'en',
            text: 'WHERE id = 102;',
          },
        ],
        correctOrder: ['tabell', 'sett', 'en'],
        hint: 'Finn kolonnen som skiller påmelding 102 fra den andre påmeldingen til person 1.',
        explanation:
          'UPDATE velger tabellen, SET gir ny status, og WHERE id = 102 velger én rad. deltaker_id = 1 treffer både 101 og 102. Her har 101 allerede ja, så en kontroll av bare antall faktisk endrede verdier kan skjule at filteret var for bredt.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-03'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-sql-03-slett',
        title: 'Hvor mange rader forsvinner?',
        role: 'retrieval',
        context:
          'Ungdomshusets tabell pameldinger har én rad per påmelding. id identifiserer påmeldingen; deltaker_id viser hvem den gjelder. status er ja for bekreftet og nei for ikke bekreftet.\n(id, deltaker_id, aktivitet, status):\n101: 1, SQL, ja.\n102: 1, Web, nei.\n103: 2, SQL, ja.\nDette er den opprinnelige listen. Anta at DELETE lykkes, uten andre virkninger eller samtidige endringer.',
        code: 'DELETE FROM pameldinger\nWHERE deltaker_id = 1;',
        question: 'Hvilke rader fjerner denne kommandoen?',
        options: [
          {
            id: 'en',
            label: 'Bare påmelding 101.',
            feedback:
              'Begge påmeldingene 101 og 102 har deltaker_id 1. SQL stopper ikke etter det første treffet.',
          },
          {
            id: 'to',
            label: 'Påmelding 101 og 102.',
          },
          {
            id: 'person',
            label: 'Deltaker 1 og alle påmeldingene.',
            feedback:
              'Kommandoen gjelder tabellen pameldinger. Den sletter ikke personen fra en annen tabell.',
          },
        ],
        correctId: 'to',
        hint: 'Se på tabellnavnet etter DELETE FROM og alle radene som passer WHERE.',
        explanation:
          '101 og 102 tilhører deltaker 1 og slettes. 103 har deltaker_id 2 og beholdes. Personen blir ikke slettet. Dette skillet er viktig når én person kan eie mange registreringer.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-03'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-sql-03-fare',
        title: 'Ny situasjon: begge priser endres',
        role: 'application',
        context:
          'En nettbutikk lagrer varer i tabellen varer, med kolonnene id og pris i kroner. Vare 7 og vare 8 koster begge 90. Bare vare 7 skal få pris 100. Anta at MySQL tillater kommandoen og at den lykkes.',
        code: 'UPDATE varer\nSET pris = 100;',
        question: 'Hvilken konsekvens får kommandoen?',
        options: [
          {
            id: 'bare',
            label: 'Bare vare 7 får pris 100.',
            feedback:
              'Kommandoen sier ingenting om id 7. Databasen kjenner ikke hensikten som bare står i utviklerens oppgave.',
          },
          {
            id: 'avvist',
            label: 'MySQL avviser den fordi WHERE alltid er påkrevd.',
            feedback:
              'WHERE er valgfritt i SQL-kommandoen. Noen klientinnstillinger kan stanse brede endringer, men her er det uttrykkelig oppgitt at den lykkes.',
          },
          {
            id: 'alle',
            label: 'Begge varene får pris 100.',
          },
        ],
        correctId: 'alle',
        hint: 'Finn vilkåret i kommandoen som eventuelt avgrenser varene.',
        explanation:
          'Uten WHERE gjelder oppdateringen alle radene. WHERE id = 7 ville avgrenset den til vare 7. Undersøk først samme utvalg med SELECT og kontroller etterpå. Andre kan endre data mellom kontroll og skriving; forhåndsvisningen er ingen lås.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-03'],
          skillIds: ['SK-SQL-01'],
        },
      },
    ],
  },
  {
    id: 'tsu-sql-04',
    title: 'Koble sammen tabeller',
    summary:
      'Følg hver kobling, også når én person har flere eller ingen treff.',
    minutes: 7,
    takeaway:
      'JOIN følger et oppgitt koblingsvilkår, ikke radplass eller like kolonnenavn. Én person kan gi flere treff. LEFT JOIN kan også beholde dem uten treff, slik at manglende tilknytning blir synlig.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-sql-04-ide',
        title: 'Navn og påmelding ligger hver for seg',
        role: 'explain',
        idea: 'Et ungdomshus vil vise navnet til personen bak hver påmelding. Databasen har to tabeller: deltakere har én rad per person med unik id og navn. pameldinger har én rad per påmelding med egen id, deltaker_id og aktivitet. deltaker_id lagrer ID-en til personen påmeldingen gjelder.\nSQL er språket for å spørre databasen. INNER JOIN kobler hver deltakerrad til hver påmeldingsrad som passer et ON-vilkår. Her må deltakerens id være lik påmeldingens deltaker_id. To påmeldinger for samme person gir to treff. Begge påmeldingene kommer med.',
        bridge: 'Neste: Les SQL-navnene for denne koblingen.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-04'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'learn',
        id: 'tsu-sql-04-navn',
        title: 'Hva betyr d og p?',
        role: 'explain',
        idea: 'AS d gir deltakere kortnavnet d; AS p gir pameldinger kortnavnet p. Slike kortnavn kalles aliaser. d.id betyr kolonnen id fra deltakere. p.id er påmeldingens eget nummer; p.deltaker_id peker på personen.\nSELECT velger opplysningene i svaret. FROM sier hvilken tabell vi begynner med. ON d.id = p.deltaker_id angir hvilke rader som hører sammen. At begge tabeller har en kolonne kalt id, betyr ikke at de to ID-ene beskriver samme ting.',
        example: {
          code: 'SELECT d.navn, p.aktivitet\nFROM deltakere AS d\nINNER JOIN pameldinger AS p\n  ON d.id = p.deltaker_id;',
          note: 'For hvert treff vises personens navn og påmeldingens aktivitet. Her er ingen bestemt sortering angitt.',
        },
        bridge: 'Neste: Bygg koblingen som følger personen bak påmeldingen.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-04'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'assemble',
        id: 'tsu-sql-04-bygg',
        title: 'Bygg koblingsvilkåret',
        role: 'scaffold',
        context:
          'd er deltakere: id identifiserer personen. p er pameldinger: id identifiserer påmeldingen, og deltaker_id viser til deltakere.id. Eksempel: Påmelding 101 har deltaker_id 1 og tilhører person 1.',
        question:
          'FROM deltakere AS d INNER JOIN pameldinger AS p er klart. Bygg ON-vilkåret; én del skal ikke brukes.',
        tokens: [
          {
            id: 'feil',
            text: 'p.id;',
          },
          {
            id: 'lik',
            text: '=',
          },
          {
            id: 'start',
            text: 'ON d.id',
          },
          {
            id: 'rett',
            text: 'p.deltaker_id;',
          },
        ],
        correctOrder: ['start', 'lik', 'rett'],
        hint: 'Hvilken av påmeldingens kolonner lagrer personens nummer?',
        explanation:
          'ON d.id = p.deltaker_id følger referansen til personen. p.id identifiserer i stedet påmeldingen. Å sammenligne person 1 med påmelding 101 ville ikke gitt dette treffet, selv om de hører sammen.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-04'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-sql-04-resultat',
        title: 'Hvor mange treff?',
        role: 'retrieval',
        context:
          'deltakere har personer med id 1, 2, 3 og 4. pameldinger har (id, deltaker_id): (101, 1), (102, 1), (103, 2). Ingen andre rader finnes.\nSpørringen viser først deltakerens id, så påmeldingens id. ORDER BY sorterer først på d.id, deretter på p.id, begge stigende.',
        code: 'SELECT d.id, p.id\nFROM deltakere AS d\nINNER JOIN pameldinger AS p\n  ON d.id = p.deltaker_id\nORDER BY d.id, p.id;',
        question: 'Hvilke ID-par kommer ut, i rekkefølge?',
        options: [
          {
            id: 'tre',
            label: '(1, 101), (1, 102), (2, 103)',
          },
          {
            id: 'en',
            label: '(1, 101), (2, 103)',
            feedback:
              'Person 1 har også påmelding 102. INNER JOIN lager en resultatrad for hvert treff, ikke bare første påmelding per person.',
          },
          {
            id: 'fire',
            label: '(1, 101), (2, 102), (3, 103), (4, NULL)',
            feedback:
              'Dette parer radene etter plass. ON bruker deltaker_id: både 101 og 102 viser til person 1. INNER JOIN tar bare med faktiske treff.',
          },
        ],
        correctId: 'tre',
        hint: 'Skriv opp alle påmeldinger som passer hver deltaker-ID, også når samme deltaker får flere.',
        explanation:
          'Person 1 får to treff: 101 og 102. Person 2 får 103. Person 3 og 4 har ingen påmeldinger og kommer ikke med i INNER JOIN. Sorteringen bestemmer rekkefølgen på de tre treffene.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-04'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'learn',
        id: 'tsu-sql-04-uten-treff',
        title: 'Hvordan finne dem uten treff?',
        role: 'explain',
        idea: 'LEFT JOIN beholder alle radene fra tabellen etter FROM, også dem uten treff i tabellen etter LEFT JOIN. Ved manglende treff får kolonnene fra den siste tabellen verdien NULL, som markerer at en verdi mangler.\nEn person med to påmeldinger får fortsatt to rader. En person uten påmelding får én rad med NULL i påmeldingsnummeret. WHERE filtrerer svaret; IS NULL kan velge nettopp radene der påmeldingsnummeret mangler.',
        bridge:
          'Neste: Bruk fraværet av en kobling til å finne en kunde uten ordre.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-04'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-sql-04-overfor',
        title: 'Ny situasjon: kunden uten ordre',
        role: 'application',
        context:
          'En butikk vil finne kunder som ennå ikke har bestilt. kunder har unik kunde_id 7 og 8. ordrer har unik ordre_id og en kunde_id som viser kunden: ordre 90 og 91 tilhører begge kunde 7. Kunde 8 har ingen ordre.\nAS k og AS o gir tabellene kortnavn. Ordrenes egne ordre_id er aldri NULL i tabellen.',
        code: 'SELECT k.kunde_id\nFROM kunder AS k\nLEFT JOIN ordrer AS o\n  ON k.kunde_id = o.kunde_id\nWHERE o.ordre_id IS NULL;',
        question: 'Hvilken kunde gir spørringen?',
        options: [
          {
            id: 'sju',
            label: '7',
            feedback:
              'Kunde 7 får to koblede rader med ordre_id 90 og 91. Ingen av disse numrene er NULL, så WHERE fjerner begge.',
          },
          {
            id: 'atte',
            label: '8',
          },
          {
            id: 'begge',
            label: '7 og 8',
            feedback:
              'LEFT JOIN beholder begge kundene før filteret. WHERE o.ordre_id IS NULL fjerner deretter treff med et kjent ordrenummer.',
          },
        ],
        correctId: 'atte',
        hint: 'Se først hva LEFT JOIN gir hver kunde, og bruk deretter testen for manglende ordrenummer.',
        explanation:
          'Kunde 8 får NULL i ordrekolonnene fordi ingen ordre matcher. Den raden beholdes av IS NULL. Dette bruker manglende tilknytning som informasjon; NULL-raden er ikke en ny ordre lagret i databasen.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-04'],
          skillIds: ['SK-SQL-01'],
        },
      },
    ],
  },
  {
    id: 'tsu-sql-05',
    title: 'Tell, grupper og sammenlign',
    summary: 'Undersøk hvilke rader et nøkkeltall faktisk beskriver.',
    minutes: 6,
    takeaway:
      'Et antall rader og et antall oppgitte verdier kan være forskjellige. Velg gruppering etter spørsmålet. Gjennomsnitt av kjente verdier forteller ikke hva de manglende verdiene ville vært.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-sql-05-ide',
        title: 'Teller vi personer eller adresser?',
        role: 'explain',
        idea: 'Et ungdomshus trenger å vite både hvor mange deltakere som er registrert, og hvor mange e-postadresser som er oppgitt. Tabellen deltakere har én rad per person. Kolonnen epost inneholder adressen, eller NULL hvis adressen mangler. NULL er ikke tallet null og heller ikke teksten «NULL».\nSQL er språket for å spørre databasen. SELECT COUNT(*) FROM deltakere teller alle radene. COUNT(epost) teller bare radene som har en verdi i epost. Det betyr ikke at adressene er kontrollert eller kan motta e-post.',
        bridge:
          'Neste: Sammenlign antall personer med antall oppgitte adresser.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-05'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-sql-05-null',
        title: 'Fire rader, hvor mange adresser?',
        role: 'scaffold',
        context:
          'Ungdomshuset lagrer fire deltakere i deltakere (id, epost):\n1: ada@eksempel.no. 2: NULL.\n3: ada3@eksempel.no. 4: dina@eksempel.no.\nNULL markerer at e-postadressen ikke er oppgitt.',
        code: 'SELECT COUNT(*), COUNT(epost)\nFROM deltakere;',
        question:
          'Første tall teller deltakerrader, andre tall teller oppgitte e-postverdier. Hvilke to tall får du?',
        options: [
          {
            id: 'fire',
            label: '4 og 4',
            feedback:
              'Deltaker 2 har ingen e-postverdi: NULL. COUNT(epost) hopper over den, selv om selve deltakerraden finnes.',
          },
          {
            id: 'tre',
            label: '3 og 3',
            feedback:
              'COUNT(*) teller personer uansett om e-postadressen mangler. Raden til deltaker 2 blir derfor også med i første tall.',
          },
          {
            id: 'rett',
            label: '4 og 3',
          },
        ],
        correctId: 'rett',
        hint: 'Tell først personradene, og tell så bare radene med en oppgitt e-postverdi.',
        explanation:
          'Fire personer er registrert, men bare tre har oppgitt adresse. En tom tekststreng ville blitt telt av COUNT(epost), fordi den ikke er NULL. Tallet tre dokumenterer oppgitte verdier, ikke tre fungerende adresser.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-05'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'learn',
        id: 'tsu-sql-05-grupper',
        title: 'Ett tall per verksted',
        role: 'explain',
        idea: 'GROUP BY samler rader som har samme verdi i en kolonne. Med GROUP BY aktivitet samles SQL-påmeldinger i én gruppe og Web-påmeldinger i en annen. COUNT(*) teller radene i hver gruppe.\nSELECT aktivitet, COUNT(*) viser aktivitetens navn og gruppens antall. FROM pameldinger sier hvor radene kommer fra. ORDER BY aktivitet sorterer gruppene etter navn; det avgjør ikke hvilke rader som tilhører gruppen.\nSpør derfor først hva hvert tall skal beskrive: en aktivitet, en status eller hele tabellen.',
        bridge: 'Neste: Bygg en oversikt per aktivitet.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-05'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'assemble',
        id: 'tsu-sql-05-bygg',
        title: 'Tell per aktivitet',
        role: 'retrieval',
        context:
          'Ungdomshusets tabell pameldinger har én rad per påmelding. id identifiserer påmeldingen; deltaker_id viser hvem den gjelder. status er ja for bekreftet og nei for ikke bekreftet.\n(id, deltaker_id, aktivitet, status):\n101: 1, SQL, ja.\n102: 1, Web, nei.\n103: 2, SQL, ja.',
        question:
          'Vis antall registrerte påmeldinger per aktivitet, også dem med status nei. Bygg én rad per aktivitet og sorter på aktivitet. Én del skal ikke brukes.',
        tokens: [
          {
            id: 'sorter',
            text: 'ORDER BY aktivitet;',
          },
          {
            id: 'feil',
            text: 'GROUP BY status',
          },
          {
            id: 'fra',
            text: 'FROM pameldinger',
          },
          {
            id: 'velg',
            text: 'SELECT aktivitet, COUNT(*)',
          },
          {
            id: 'gruppe',
            text: 'GROUP BY aktivitet',
          },
        ],
        correctOrder: ['velg', 'fra', 'gruppe', 'sorter'],
        hint: 'Hva skal én rad i oppsummeringen handle om? Ikke bland gruppenes innhold med sorteringen.',
        explanation:
          'GROUP BY aktivitet gir SQL med 2 påmeldinger og Web med 1. Status nei er ikke filtrert bort. GROUP BY status ville laget ja/nei-grupper og svart på et annet spørsmål; da kan aktivitet heller ikke velges som om hver statusgruppe hadde ett aktivitetsnavn.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-05'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'learn',
        id: 'tsu-sql-05-kjente-tall',
        title: 'Når et tall mangler',
        role: 'explain',
        idea: 'AVG beregner gjennomsnitt: summen av de kjente tallene delt på antallet kjente tall. MIN finner det minste og MAX det største. Disse funksjonene hopper over NULL.\nHvis kjente ventetider er 3 og 5 dager, er gjennomsnittet 4 dager, minste verdi 3 og største 5. En tredje, ukjent ventetid regnes ikke som null dager. Tallene beskriver bare tidene som faktisk er kjent.',
        bridge: 'Neste: Vurder hva en butikk kan si om leveringstiden sin.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-05'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-sql-05-overfor',
        title: 'Ny situasjon: leveringstid',
        role: 'application',
        context:
          'En butikk lagrer leveranser i en tabell med én rad per pakke. Kolonnen dager viser tiden fra bestilling til levering. Pakke 1 brukte 2 dager, pakke 2 brukte 4 dager, og pakke 3 er ikke levert: dager er NULL.\nButikken vil vite gjennomsnitt, minste og største kjente leveringstid.',
        code: 'SELECT AVG(dager), MIN(dager),\n       MAX(dager)\nFROM leveranser;',
        question: 'Hvilke verdier gir spørringen, i den rekkefølgen?',
        options: [
          {
            id: 'null',
            label: '2, 0, 4',
            feedback:
              'Her er NULL behandlet som null dager. Pakke 3 er fortsatt underveis; det er ingen kjent leveringstid å summere eller bruke som minste tid.',
          },
          {
            id: 'rett',
            label: '3, 2, 4',
          },
          {
            id: 'alle',
            label: 'NULL, NULL, NULL',
            feedback:
              'En manglende tid gjør ikke de to kjente tidene ubrukelige. Funksjonene beregner fra 2 og 4 og hopper over NULL.',
          },
        ],
        correctId: 'rett',
        hint: 'Hvilke pakker har faktisk en kjent leveringstid?',
        explanation:
          '(2 + 4) / 2 = 3; minste tid er 2 og største 4. Gjennomsnittet gjelder de to leverte pakkene. Det sier ikke at alle tre vil ha et gjennomsnitt på tre dager: Pakken som fortsatt er underveis, kan endre bildet.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-05'],
          skillIds: ['SK-SQL-01'],
        },
      },
    ],
  },
  {
    id: 'tsu-sql-06',
    title: 'Finn feilen før den gjør skade',
    summary:
      'Kontroller hvilke rader kommandoen velger, og når endringen blir endelig.',
    minutes: 6,
    takeaway:
      'Kontroller at vilkåret velger de tiltenkte radene. Undersøk radendringer før COMMIT. Bruk parameterbinding når et vilkår trenger tekst fra en bruker, slik at teksten forblir data.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-sql-06-ide',
        title: 'Velger kommandoen riktige rader?',
        role: 'explain',
        idea: 'Du lager et administrasjonspanel for et ungdomshus. Før data endres, må du kontrollere hvilke rader som blir valgt. SQL er språket appen bruker for å spørre databasen.\nTabellen deltakere har én rad per person, med id og epost. SELECT id henter ID-er; FROM deltakere velger tabellen, og WHERE avgrenser radene. NULL markerer manglende verdi. epost = NULL blir ikke sant. epost IS NULL finner manglende adresser.',
        bridge:
          'Neste: Kontroller utvalget før ungdomshuset kontakter deltakere uten adresse.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-06'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-sql-06-rett',
        title: 'Rett kolonnen og sammenligningen',
        role: 'scaffold',
        context:
          'Et utdrag av deltakere (id, epost):\n1: ada@eksempel.no. 2: NULL (adressen er ikke oppgitt). Ingen andre deltakere mangler adresse.',
        code: 'SELECT id\nFROM deltakere\nWHERE email = NULL;',
        question:
          'Panelet skal finne ID-en uten adresse. Hvilken linje passer?',
        options: [
          {
            id: 'kolonne',
            label: 'WHERE epost = NULL;',
            feedback:
              'Kolonnenavnet er rettet, men = NULL blir ikke sant. Bruk testen for manglende verdi, ikke vanlig likhet.',
          },
          {
            id: 'rett',
            label: 'WHERE epost IS NULL;',
          },
          {
            id: 'tekst',
            label: "WHERE epost = 'NULL';",
            feedback:
              'Dette leter etter bokstavene NULL som e-postverdi. I eksemplet er adressen fraværende, ikke lagret som disse bokstavene.',
          },
        ],
        correctId: 'rett',
        hint: 'Kolonnen heter epost. Skal du finne tekst eller en manglende verdi?',
        explanation:
          "epost IS NULL finner id 2. = NULL blir ikke sant; = 'NULL' søker etter bokstavene NULL. Kolonnen heter epost, ikke email. Utvalget må undersøkes før det brukes videre.",
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-06'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'learn',
        id: 'tsu-sql-06-angre',
        title: 'Kontroller før endringen blir endelig',
        role: 'explain',
        idea: 'Panelet skal fjerne en feilregistrert påmelding. DELETE fjerner radene som passer WHERE. En transaksjon lar deg kontrollere radendringer før de blir endelige. START TRANSACTION åpner den, COMMIT gjør endringene endelige, og ROLLBACK avbryter før COMMIT.\nEksemplet bruker MySQL med InnoDB-tabeller, som støtter dette. Vanlig DROP TABLE fjerner selve tabellen og kan ikke angres med denne oppskriften.\nNår automatisk lagring er på utenfor en transaksjon, blir hver radendring endelig med en gang.',
        bridge:
          'Neste: Legg resultatkontrollen mens slettingen fortsatt kan avbrytes.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-06'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-sql-06-transaksjon',
        title: 'Slett én påmelding, behold tabellen',
        role: 'retrieval',
        context:
          'InnoDB-tabellen pameldinger har unik id 101, 102 og 103. Bare 102 skal slettes; ingen andre skriver. DELETE nedenfor bruker WHERE id = 102. Kontrollen skal bekrefte at bare 102 er fjernet. Utenfor en transaksjon er automatisk lagring på.',
        question:
          'Hvilken rekkefølge gir kontroll mens slettingen fortsatt kan angres?',
        options: [
          {
            id: 'rett',
            label: 'START TRANSACTION → DELETE → kontroller → COMMIT.',
          },
          {
            id: 'drop',
            label: 'DELETE → START TRANSACTION → kontroller → COMMIT.',
            feedback:
              'Da skjer slettingen før transaksjonen starter. Automatisk lagring gjør denne første slettingen endelig; en senere transaksjon beskytter den ikke.',
          },
          {
            id: 'etter',
            label: 'START TRANSACTION → DELETE → COMMIT → kontroller.',
            feedback:
              'Kontrollen kommer etter at slettingen er endelig. ROLLBACK etter COMMIT kan ikke angre den.',
          },
        ],
        correctId: 'rett',
        hint: 'Finn tidspunktet der endringen blir endelig i hver rekkefølge.',
        explanation:
          'Start før DELETE, kontroller før COMMIT. Ved feil velger du ROLLBACK i stedet. Den angrer radendringene i den åpne transaksjonen, ikke allerede endelige slettinger.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-06'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'learn',
        id: 'tsu-sql-06-parametre',
        title: 'Hvem får bestemme vilkåret?',
        role: 'explain',
        idea: 'Et navnesøk må også beholde riktig utvalg. Limes søketekst inn i SQL, kan anførselstegn i teksten endre kommandoen: SQL-injeksjon.\nParameterbinding betyr at appen sender SQL-mønster og søkeverdi separat til databasebiblioteket, koden som kommuniserer med databasen. Biblioteket behandler verdien som data. I neste eksempel viser ? plassen for verdien. Tegnet avhenger av biblioteket; det er ingen ferdig verdi i MySQL-konsollen.',
        bridge: 'Neste: Bevar skillet mellom søkeverdi og SQL i en butikkapp.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-06'],
          skillIds: ['SK-SQL-01'],
        },
      },
      {
        kind: 'select',
        id: 'tsu-sql-06-overfor',
        title: 'Ny situasjon: et farlig søkefelt',
        role: 'application',
        context:
          "En butikk søker i kunder (kunde_id, navn). Noen skriver: ' OR 1=1 -- \nHele søketeksten skal sammenlignes med navn. Databasebiblioteket støtter ? som plassholder for en separat verdi.",
        question:
          'Spørringen begynner med SELECT kunde_id FROM kunder. Hvordan bør appen bygge resten?',
        options: [
          {
            id: 'lim',
            label:
              'Bygg WHERE navn = med søketeksten mellom anførselstegn i SQL-strengen.',
            feedback:
              'Tekstens anførselstegn kan avslutte verdien; resten kan bli SQL-kode. Appens tiltenkte vilkår kan da bli endret.',
          },
          {
            id: 'param',
            label:
              'Send WHERE navn = ? og søketeksten som en separat parameterverdi.',
          },
          {
            id: 'bare',
            label:
              'Fjern anførselstegn fra søketeksten før den settes inn i SQL-strengen.',
            feedback:
              "En slik tegnregel kan ødelegge gyldige navn som O'Neil. Bruk databasebibliotekets skille mellom kommando og verdi i stedet for hjemmelaget innliming.",
          },
        ],
        correctId: 'param',
        hint: 'Hvilket alternativ lar databasebiblioteket skille SQL-mønsteret fra hele søkeverdien?',
        explanation:
          'Binding gjør hele teksten til én verdi; OR blir ikke et nytt vilkår. Parametere er verdier, ikke tabellnavn. Appen trenger fortsatt riktige tilgangsregler. Utvalget skal følge utviklerens vilkår, ikke endres av søketeksten.',
        source: {
          moduleId: 'tenk-som-en-utvikler',
          lessonUnitIds: ['SQL84-06'],
          skillIds: ['SK-SQL-01'],
        },
      },
    ],
  },
];
