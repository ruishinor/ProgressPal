import type { MicroSession, MicroSource } from '@/lib/domain';

// Track-owned references: docs/utviklerblikk-sql-mysql.md. No SQL execution.
const source = (id: string): MicroSource => ({
  moduleId: 'tenk-som-en-utvikler',
  lessonUnitIds: ['SQL84-' + id],
  skillIds: ['SK-SQL-01'],
});
const people =
  'deltakere (id, navn, alder):\nID 1: Ada, 17 år. ID 2: Bo, 20 år.\nID 3: Ada, 22 år. ID 4: Dina, 30 år.';
const registrations =
  'pameldinger (id, deltaker_id, aktivitet, status):\n101: deltaker 1, SQL, ja.\n102: deltaker 1, Web, nei.\n103: deltaker 2, SQL, ja.';
const emails =
  'deltakere (id, epost):\n1: ada@eksempel.no. 2: NULL.\n3: ada3@eksempel.no. 4: dina@eksempel.no.\nNULL betyr at adressen ikke er oppgitt.';

export const sqlMysqlSessions: readonly MicroSession[] = [
  {
    id: 'tsu-sql-01',
    title: 'Hvordan henger data sammen?',
    summary: 'Koble rader med riktige nøkler.',
    minutes: 4,
    takeaway:
      'Primærnøkkel identifiserer raden; fremmednøkkel kobler den til en annen.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-sql-01-ide',
        title: 'Én rad, flere egenskaper',
        role: 'explain',
        source: source('01'),
        idea: 'Tabeller (tables) lagrer rader (rows), én per deltaker. Kolonner (columns) beskriver egenskapene.\nCREATE TABLE lager strukturen. INT er heltall; VARCHAR(40) er tekst på inntil 40 tegn. PRIMARY KEY krever unik ID uten NULL. Navn kan deles. MySQL 8.4 er et databasesystem som bruker SQL.\nEn fremmednøkkel viser til en nøkkel i en annen tabell.',
        example: {
          code: 'CREATE TABLE deltakere (\n  id INT PRIMARY KEY,\n  navn VARCHAR(40) NOT NULL,\n  alder INT NOT NULL,\n  epost VARCHAR(80)\n);',
          note: 'NULL er manglende verdi; NOT NULL krever en verdi.',
        },
        bridge: 'Neste: finn eieren av en påmelding.',
      },
      {
        kind: 'select',
        id: 'tsu-sql-01-nokkel',
        title: 'Hvem hører raden til?',
        role: 'scaffold',
        source: source('01'),
        context:
          'deltakere (id, navn, alder):\nID 1: Ada, 17 år. ID 2: Bo, 20 år.\nID 3: Ada, 22 år. ID 4: Dina, 30 år.\ndeltakere: id er primærnøkkel.\npameldinger: id er primærnøkkel; deltaker_id er fremmednøkkel til deltakere.id.\nPåmelding 102 har deltaker_id 1.',
        question: 'Hvilken deltaker tilhører påmelding 102?',
        options: [
          {
            id: 'begge',
            label: 'Begge som heter Ada.',
            feedback: 'Navn kan deles. Fremmednøkkelen peker på én ID.',
          },
          {
            id: 'en',
            label: 'Ada med ID 1.',
          },
          {
            id: 'to',
            label: 'Bo med ID 2.',
            feedback: '102 identifiserer påmeldingen. deltaker_id er 1.',
          },
        ],
        correctId: 'en',
        hint: 'Følg fremmednøkkelen til deltakerens ID.',
        explanation: '102 peker på ID 1, ikke Ada med ID 3.',
      },
      {
        kind: 'select',
        id: 'tsu-sql-01-relasjon',
        title: 'Kan vi registrere deltaker 9?',
        role: 'application',
        source: source('01'),
        context:
          'deltakere (id, navn, alder):\nID 1: Ada, 17 år. ID 2: Bo, 20 år.\nID 3: Ada, 22 år. ID 4: Dina, 30 år.\ndeltakere: id er primærnøkkel.\npameldinger: id er primærnøkkel; deltaker_id er fremmednøkkel til deltakere.id.\nTabellene bruker InnoDB, og fremmednøkkelen håndheves.',
        question: 'Hva skjer med en ny påmelding med deltaker_id 9?',
        options: [
          {
            id: 'lager',
            label: 'Den lager automatisk deltaker 9.',
            feedback: 'Fremmednøkkelen lager ingen ny deltaker.',
          },
          {
            id: 'avvist',
            label: 'Den avvises fordi deltaker 9 ikke finnes.',
          },
          {
            id: 'fri',
            label: 'Den lagres uten tilknytning.',
            feedback: 'Fremmednøkkelen avviser en ukjent deltaker-ID.',
          },
        ],
        correctId: 'avvist',
        hint: 'Hvilken rad kan 9 vise til?',
        explanation: 'Fremmednøkkelen krever at deltaker 9 finnes først.',
      },
      {
        kind: 'select',
        id: 'tsu-sql-01-overfor',
        title: 'Ny situasjon: delte telefonnumre',
        role: 'application',
        source: source('01'),
        context:
          'kunder har kunde_id INT PRIMARY KEY, navn og telefon. To kunder deler telefon. Én kunde kan ha flere ordre med egen ordre_id.',
        question: 'Hva bør ordren lagre for å vise til riktig kunde?',
        options: [
          {
            id: 'telefon',
            label: 'Telefon som fremmednøkkel.',
            feedback: 'Nummeret deles av to kunder.',
          },
          {
            id: 'ordre',
            label: 'Bare sin egen ordre_id.',
            feedback: 'Ordre-ID sier ikke hvem kunden er.',
          },
          {
            id: 'kunde',
            label: 'kunde_id som fremmednøkkel til kunder.kunde_id.',
          },
        ],
        correctId: 'kunde',
        hint: 'Hvilket felt er unikt for kunden?',
        explanation: 'Flere ordre kan peke på samme kunde_id.',
      },
    ],
  },
  {
    id: 'tsu-sql-02',
    title: 'Finn riktig informasjon',
    summary: 'Bygg filter og forutsi resultatet.',
    minutes: 4,
    takeaway:
      'SELECT velger kolonner, WHERE rader. AND krever begge vilkår. ORDER BY sorterer.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-sql-02-ide',
        title: 'Hent bare det du trenger',
        role: 'explain',
        source: source('02'),
        idea: 'SELECT velger kolonner, FROM tabell. WHERE krever et sant vilkår. >= betyr minst; AND krever begge vilkår, OR minst ett.\nORDER BY alder ASC sorterer stigende; DESC synkende. Uten ORDER BY er rekkefølgen ikke garantert.',
        example: {
          code: 'SELECT navn\nFROM deltakere\nWHERE alder >= 20\nORDER BY alder DESC\nLIMIT 2;',
          note: 'De to eldste over eller lik 20 år.',
        },
        bridge: 'Neste: bygg et filter.',
      },
      {
        kind: 'assemble',
        id: 'tsu-sql-02-bygg',
        title: 'Bygg aldersfilteret',
        role: 'scaffold',
        source: source('02'),
        context: people,
        question:
          'Hent bare navn, fra 18 til og med 25 år, yngst først. Bruk de ferdige delene.',
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
        hint: 'Begge aldersgrenser må gjelde.',
        explanation:
          'AND gir Bo, så Ada. OR tar med alle fire: hver passer minst én grense.',
      },
      {
        kind: 'select',
        id: 'tsu-sql-02-resultat',
        title: 'Hvilke navn kommer ut?',
        role: 'application',
        source: source('02'),
        context: people,
        code: 'SELECT navn\nFROM deltakere\nWHERE alder >= 20\nORDER BY alder DESC\nLIMIT 2;',
        question: 'Hva er resultatet, i denne rekkefølgen?',
        options: [
          {
            id: 'yngst',
            label: 'Bo, Ada',
            feedback: 'DESC begynner med høyest alder.',
          },
          {
            id: 'eldst',
            label: 'Dina, Ada',
          },
          {
            id: 'tre',
            label: 'Dina, Ada, Bo',
            feedback: 'LIMIT 2 beholder bare de to første etter sortering.',
          },
        ],
        correctId: 'eldst',
        hint: 'Filtrer, sorter, begrens antallet.',
        explanation:
          'Filteret gir 20, 22 og 30. DESC og LIMIT 2 beholder Dina (30) og Ada (22). Aldrene er ulike.',
      },
      {
        kind: 'select',
        id: 'tsu-sql-02-overfor',
        title: 'Ny situasjon: ledige bøker',
        role: 'application',
        source: source('02'),
        context:
          'boker har id INT PRIMARY KEY, ledig INT og sider INT. ledig er 1 eller 0.\nID 11: ledig 1, sider 90.\nID 12: ledig 0, sider 60.\nID 13: ledig 1, sider 150.',
        question:
          'Du trenger ID-ene til ledige bøker med under 100 sider. Hvilket filter passer etter SELECT id FROM boker?',
        options: [
          {
            id: 'og',
            label: 'WHERE ledig = 1 AND sider < 100;',
          },
          {
            id: 'eller',
            label: 'WHERE ledig = 1 OR sider < 100;',
            feedback: 'OR tar også med ID 12 (utlånt) og 13 (for lang).',
          },
          {
            id: 'stor',
            label: 'WHERE ledig = 1 AND sider > 100;',
            feedback: 'Det gir ID 13 på 150 sider, ikke under 100.',
          },
        ],
        correctId: 'og',
        hint: 'Begge vilkår må stemme.',
        explanation: 'Bare ID 11 passer begge vilkår.',
      },
    ],
  },
  {
    id: 'tsu-sql-03',
    title: 'Legg til og endre data',
    summary: 'Avgrens endringer og finn målradene.',
    minutes: 5,
    takeaway:
      'Sjekk samme WHERE med SELECT før skriving, og antallet etterpå. Andre kan skrive i mellomtiden.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-sql-03-ide',
        title: 'Tre forskjellige endringer',
        role: 'explain',
        source: source('03'),
        idea: 'INSERT INTO legger til; VALUES følger kolonnerekkefølgen. UPDATE med SET endrer rader. DELETE FROM fjerner rader.\nWHERE avgrenser skrivingen. Sjekk målradene med SELECT og samme filter før endring, og antallet etterpå.',
        example: {
          code: "INSERT INTO pameldinger\n  (id, deltaker_id, aktivitet, status)\nVALUES (104, 3, 'Web', 'ja');",
          note: 'Ny påmelding 104 for deltaker 3.',
        },
        bridge: 'Neste: oppdater én påmelding.',
      },
      {
        kind: 'assemble',
        id: 'tsu-sql-03-bygg',
        title: 'Endre bare påmelding 102',
        role: 'scaffold',
        source: source('03'),
        context: registrations,
        question: 'Sett status til ja på bare påmelding 102.',
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
        hint: 'Hvilken ID tilhører påmeldingen?',
        explanation:
          'id = 102 endrer én rad. deltaker_id = 1 treffer to; 101 har allerede ja.',
      },
      {
        kind: 'select',
        id: 'tsu-sql-03-slett',
        title: 'Hvor mange rader forsvinner?',
        role: 'application',
        source: source('03'),
        context:
          'pameldinger (id, deltaker_id, aktivitet, status):\n101: deltaker 1, SQL, ja.\n102: deltaker 1, Web, nei.\n103: deltaker 2, SQL, ja.\nAnta at kommandoen lykkes.',
        code: 'DELETE FROM pameldinger\nWHERE deltaker_id = 1;',
        question: 'Hva blir slettet?',
        options: [
          {
            id: 'en',
            label: 'Bare påmelding 101.',
            feedback: 'To rader har deltaker_id 1: 101 og 102.',
          },
          {
            id: 'to',
            label: 'Påmelding 101 og 102.',
          },
          {
            id: 'person',
            label: 'Deltaker 1 og alle påmeldingene.',
            feedback: 'DELETE gjelder pameldinger, ikke deltakere.',
          },
        ],
        correctId: 'to',
        hint: 'Finn alle rader med deltaker_id 1.',
        explanation: '101 og 102 slettes. 103 og deltakerne beholdes.',
      },
      {
        kind: 'select',
        id: 'tsu-sql-03-fare',
        title: 'Ny situasjon: begge priser endres',
        role: 'application',
        source: source('03'),
        context:
          'varer (id INT PRIMARY KEY, pris INT): ID 7 koster 90, ID 8 koster 90. Bare vare 7 skal koste 100. Anta at kommandoen lykkes.',
        code: 'UPDATE varer\nSET pris = 100;',
        question: 'Hvilken konsekvens har kommandoen?',
        options: [
          {
            id: 'bare',
            label: 'Bare vare 7 får pris 100.',
            feedback: 'Uten WHERE velges ikke automatisk én vare.',
          },
          {
            id: 'avvist',
            label: 'MySQL krever alltid WHERE og avviser den.',
            feedback:
              'WHERE er valgfritt. Enkelte klienter kan advare, men du kan ikke stole på det.',
          },
          {
            id: 'alle',
            label: 'Begge varene får pris 100.',
          },
        ],
        correctId: 'alle',
        hint: 'Hva avgrenser målradene?',
        explanation:
          'Begge endres. Bruk WHERE id = 7; sjekk samme filter med SELECT først og én endret rad etterpå. Andre kan skrive i mellomtiden.',
      },
    ],
  },
  {
    id: 'tsu-sql-04',
    title: 'Koble sammen tabeller',
    summary: 'Bygg JOIN og tolk treffene.',
    minutes: 5,
    takeaway:
      'JOIN kan gi flere rader per person. LEFT JOIN beholder også dem uten treff.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-sql-04-ide',
        title: 'Koble identiteter, ikke like kolonnenavn',
        role: 'explain',
        source: source('04'),
        idea: 'deltaker_id viser til deltakere.id, så navnet lagres ett sted.\nINNER JOIN beholder treff som passer ON. d og p er korte tabellnavn (aliaser). d.id og p.id gjelder forskjellige ting.',
        example: {
          code: 'SELECT d.navn, p.aktivitet\nFROM deltakere AS d\nINNER JOIN pameldinger AS p\n  ON d.id = p.deltaker_id;',
          note: 'Én rad per treff; usortert.',
        },
        bridge: 'Neste: bygg koblingen.',
      },
      {
        kind: 'assemble',
        id: 'tsu-sql-04-bygg',
        title: 'Bygg koblingsvilkåret',
        role: 'scaffold',
        source: source('04'),
        context:
          'deltakere: id er primærnøkkel.\npameldinger: id er primærnøkkel; deltaker_id er fremmednøkkel til deltakere.id.',
        question:
          'FROM deltakere AS d INNER JOIN pameldinger AS p er klart. Bygg ON-vilkåret.',
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
        hint: 'Følg fremmednøkkelen.',
        explanation:
          'Fremmednøkkelen er p.deltaker_id; p.id er påmeldingens egen ID.',
      },
      {
        kind: 'select',
        id: 'tsu-sql-04-resultat',
        title: 'Hvor mange treff?',
        role: 'application',
        source: source('04'),
        context:
          'deltakere (id): 1, 2, 3, 4.\npameldinger (id, deltaker_id):\n(101, 1), (102, 1), (103, 2).',
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
            feedback: 'Deltaker 1 har to treff, og begge kommer med.',
          },
          {
            id: 'fire',
            label: '(1, 101), (2, 102), (3, 103), (4, NULL)',
            feedback:
              'Koblingen bruker ID, ikke radplass. INNER JOIN utelater ID 4 uten treff.',
          },
        ],
        correctId: 'tre',
        hint: 'Tell alle treff per deltaker.',
        explanation:
          'ID 1 har to treff; ID 2 ett. 3 og 4 faller bort. ORDER BY sorterer treffene.',
      },
      {
        kind: 'select',
        id: 'tsu-sql-04-overfor',
        title: 'Ny situasjon: kunden uten ordre',
        role: 'application',
        source: source('04'),
        context:
          'LEFT JOIN beholder venstresidens rader uten treff og fyller høyresiden med NULL.\nkunder har kunde_id INT PRIMARY KEY: 7 og 8.\nordrer har ordre_id INT PRIMARY KEY og kunde_id som fremmednøkkel: ordre 90 til kunde 7, ordre 91 til kunde 7.',
        code: 'SELECT k.kunde_id\nFROM kunder AS k\nLEFT JOIN ordrer AS o\n  ON k.kunde_id = o.kunde_id\nWHERE o.ordre_id IS NULL;',
        question:
          'Hvilken kunde returneres? IS NULL tester om verdien mangler.',
        options: [
          {
            id: 'sju',
            label: '7',
            feedback: 'Begge treffene til 7 har ordre-ID, ikke NULL.',
          },
          {
            id: 'atte',
            label: '8',
          },
          {
            id: 'begge',
            label: '7 og 8',
            feedback: 'WHERE fjerner treffene med kjent ordre-ID.',
          },
        ],
        correctId: 'atte',
        hint: 'Hvem får NULL på høyresiden?',
        explanation:
          '8 får NULL uten ordre. Begge treffene til 7 har ordre-ID og fjernes av WHERE.',
      },
    ],
  },
  {
    id: 'tsu-sql-05',
    title: 'Tell, grupper og sammenlign',
    summary: 'Bygg grupper og tolk nøkkeltall.',
    minutes: 5,
    takeaway:
      'COUNT(*) teller rader, COUNT(kolonne) kjente verdier. GROUP BY grupperer; ORDER BY sorterer.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-sql-05-ide',
        title: 'Fra rader til en oppsummering',
        role: 'explain',
        source: source('05'),
        idea: 'COUNT(*) teller rader; COUNT(epost) bare kjente verdier. AVG gir gjennomsnitt, MIN minste og MAX største verdi. NULL hoppes over.\nGROUP BY gir én rad per gruppe. SELECT viser gruppekolonnen og aggregater som COUNT(*). ORDER BY sorterer etterpå.',
        example: {
          code: 'SELECT aktivitet, COUNT(*)\nFROM pameldinger\nGROUP BY aktivitet\nORDER BY aktivitet;',
          note: 'Antall påmeldinger per aktivitet, også status nei.',
        },
        bridge: 'Neste: tell rader og adresser.',
      },
      {
        kind: 'select',
        id: 'tsu-sql-05-null',
        title: 'Fire rader, hvor mange adresser?',
        role: 'scaffold',
        source: source('05'),
        context: emails,
        code: 'SELECT COUNT(*), COUNT(epost)\nFROM deltakere;',
        question: 'Hvilke to tall returneres?',
        options: [
          {
            id: 'fire',
            label: '4 og 4',
            feedback: 'COUNT(epost) hopper over NULL.',
          },
          {
            id: 'tre',
            label: '3 og 3',
            feedback: 'COUNT(*) teller også raden med NULL.',
          },
          {
            id: 'rett',
            label: '4 og 3',
          },
        ],
        correctId: 'rett',
        hint: 'Tell rader, så oppgitte adresser.',
        explanation:
          'COUNT(epost) hopper over NULL, men ville telt en tom tekststreng.',
      },
      {
        kind: 'assemble',
        id: 'tsu-sql-05-bygg',
        title: 'Tell per aktivitet',
        role: 'application',
        source: source('05'),
        context: registrations,
        question:
          'Bygg én rad per aktivitet med antall påmeldinger, også status nei. Sorter på aktivitet.',
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
        hint: 'Hva bestemmer hver gruppe?',
        explanation:
          'GROUP BY aktivitet gir SQL 2 og Web 1. GROUP BY status deler i ja/nei-grupper; da kan ikke aktivitet velges fritt.',
      },
      {
        kind: 'select',
        id: 'tsu-sql-05-overfor',
        title: 'Ny situasjon: leveringstid',
        role: 'application',
        source: source('05'),
        context:
          'leveranser har id INT PRIMARY KEY og dager INT som kan være NULL.\nID 1: 2 dager. ID 2: 4 dager. ID 3: NULL (ikke levert ennå).',
        code: 'SELECT AVG(dager), MIN(dager),\n       MAX(dager)\nFROM leveranser;',
        question: 'Hvilke verdier får du, i den rekkefølgen?',
        options: [
          {
            id: 'null',
            label: '2, 0, 4',
            feedback: 'NULL er ikke 0 dager; funksjonene hopper over den.',
          },
          {
            id: 'rett',
            label: '3, 2, 4',
          },
          {
            id: 'alle',
            label: 'NULL, NULL, NULL',
            feedback: 'Funksjonene bruker de to kjente verdiene.',
          },
        ],
        correctId: 'rett',
        hint: 'Hvilke tider er kjent?',
        explanation: '(2 + 4) / 2 = 3; MIN er 2, MAX 4. NULL hoppes over.',
      },
    ],
  },
  {
    id: 'tsu-sql-06',
    title: 'Finn feilen før den gjør skade',
    summary: 'Rett feil og beskytt data.',
    minutes: 5,
    takeaway:
      'Sjekk navn og vilkår. Bruk IS NULL og parameterbinding. ROLLBACK kan ikke angre alt.',
    cards: [
      {
        kind: 'learn',
        id: 'tsu-sql-06-ide',
        title: 'Gyldig SQL kan svare på feil spørsmål',
        role: 'explain',
        source: source('06'),
        idea: 'Gyldig SQL kan gi feil resultat. Sjekk tabellnavn, kolonner og vilkår.\nNULL mangler verdi. = NULL blir ikke sant; bruk IS NULL eller IS NOT NULL.\nUPDATE/DELETE endrer rader. ALTER TABLE endrer struktur (for eksempel ADD epost VARCHAR(80)); DROP TABLE fjerner tabellen.',
        bridge: 'Neste: rett et NULL-søk.',
      },
      {
        kind: 'select',
        id: 'tsu-sql-06-rett',
        title: 'Rett kolonnen og sammenligningen',
        role: 'scaffold',
        source: source('06'),
        context: emails,
        code: 'SELECT id\nFROM deltakere\nWHERE email = NULL;',
        question:
          'Finn ID-en uten adresse. Hvilken WHERE-linje retter begge feil?',
        options: [
          {
            id: 'kolonne',
            label: 'WHERE epost = NULL;',
            feedback: '= NULL blir ikke sant og finner ingen rader.',
          },
          {
            id: 'rett',
            label: 'WHERE epost IS NULL;',
          },
          {
            id: 'tekst',
            label: "WHERE epost = 'NULL';",
            feedback: 'Det søker etter tekst, ikke fravær av verdi.',
          },
        ],
        correctId: 'rett',
        hint: 'Sjekk kolonnenavn og testen for manglende verdi.',
        explanation:
          'Kolonnen heter epost, ikke email. IS NULL finner ID 2; = NULL blir ikke sant.',
      },
      {
        kind: 'select',
        id: 'tsu-sql-06-transaksjon',
        title: 'Slett én påmelding, behold tabellen',
        role: 'application',
        source: source('06'),
        context:
          'pameldinger har primærnøkkel id: 101, 102 og 103. Bare 102 skal slettes. Ingen andre skriver i øvelsen.\nInnoDB lar ROLLBACK angre radendringer før COMMIT. Vanlig ALTER/DROP TABLE kan avslutte transaksjonen og kan ikke angres slik. Sikkerhetskopi gir en annen mulig gjenoppretting.',
        question:
          'Hvilken fremgangsmåte gir kontroll før endringen lagres endelig?',
        options: [
          {
            id: 'rett',
            label:
              'START TRANSACTION; SELECT med id = 102; DELETE med samme WHERE; kontroller én slettet rad; velg COMMIT eller ROLLBACK.',
          },
          {
            id: 'drop',
            label: 'DROP TABLE pameldinger; bruk ROLLBACK hvis noe ble feil.',
            feedback: 'DROP fjerner tabellen uten mulighet for ROLLBACK.',
          },
          {
            id: 'etter',
            label:
              'DELETE med id = 102; COMMIT; kontroller og bruk ROLLBACK ved feil.',
            feedback:
              'Etter COMMIT er slettingen lagret. Kontroller før COMMIT.',
          },
        ],
        correctId: 'rett',
        hint: 'Når kan slettingen fortsatt angres?',
        explanation:
          'Kontroller før COMMIT. ROLLBACK kan angre denne InnoDB-slettingen, men ikke vanlig DROP TABLE.',
      },
      {
        kind: 'select',
        id: 'tsu-sql-06-overfor',
        title: 'Ny situasjon: et farlig søkefelt',
        role: 'application',
        source: source('06'),
        context:
          "SQL injection lar input endre SQL-koden. Parameterbinding sender SQL og verdier separat via driveren. Plassholderen avhenger av API-et; ? er ikke en verdi i MySQL-konsollen.\nkunder har kunde_id (primærnøkkel) og navn (tekst). Input er: ' OR 1=1 -- \nInput skal forbli tekst.",
        question: 'Hva bør applikasjonen gjøre med input?',
        options: [
          {
            id: 'lim',
            label: 'Lime teksten inn i WHERE navn = sammen med anførselstegn.',
            feedback: 'Input kan lukke tekstverdien og endre filteret.',
          },
          {
            id: 'param',
            label:
              'Parameterbinding: SELECT kunde_id FROM kunder WHERE navn = ? med input som separat verdi.',
          },
          {
            id: 'bare',
            label: 'Slette mellomrom fra input før teksten limes inn.',
            feedback:
              'Å fjerne mellomrom hindrer ikke injeksjon og kan ødelegge navn.',
          },
        ],
        correctId: 'param',
        hint: 'Hold SQL og input atskilt.',
        explanation:
          'Driveren binder hele input som én verdi; OR forblir tekst. Parametere er verdier, ikke tabellnavn.',
      },
    ],
  },
];
