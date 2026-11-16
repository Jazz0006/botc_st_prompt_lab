// Mirrors the Host's pre-commit opening candidates (InitialOpeningDomainV3 and the Session
// information resolvers in Jazz0006/CampBoardGameHost). The Host stays the authority:
// scripts/verify-lab.cjs compares this output with requests exported from the Host.

export type RoleType = 'townsfolk' | 'outsider' | 'minion' | 'demon';
export type DomainSeat = { seat: number; role: string };
type Json = Record<string, unknown>;

// Host order for script roles: Demon bluff candidates, then Outsiders and Minions.
const GOOD_ROLE_ORDER = ['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneteller',
  'ravenkeeper', 'soldier', 'mayor', 'butler', 'drunk', 'recluse', 'saint', 'undertaker', 'monk',
  'virgin', 'slayer'];
const OUTSIDER_ORDER = ['butler', 'drunk', 'recluse', 'saint'];
const MINION_ORDER = ['poisoner', 'spy', 'scarletwoman', 'baron'];
const PAIR_KIND: Record<string, RoleType> = { washerwoman: 'townsfolk', librarian: 'outsider', investigator: 'minion' };

const range = (upper: number) => Array.from({ length: upper + 1 }, (_, i) => i);
const sorted = (values: Iterable<number>) => [...values].sort((a, b) => a - b);

/** A functioning Spy may register as good and a functioning Recluse as evil; nobody is poisoned yet. */
function evilRegistrations(role: string, type: RoleType): boolean[] {
  if (role === 'spy' || role === 'recluse') return [false, true];
  return [type === 'minion' || type === 'demon'];
}

/** Chef: each Spy/Recluse registers once per reading, so both of its neighbouring pairs agree. */
function adjacentEvilPairCounts(circle: boolean[][]): number[] {
  const result = new Set<number>();
  for (const first of circle[0]) {
    let partial = new Map<string, [boolean, number]>([[`${first}:0`, [first, 0]]]);
    for (const options of circle.slice(1)) {
      const next = new Map<string, [boolean, number]>();
      for (const [previous, count] of partial.values()) for (const current of options) {
        const total = count + (previous && current ? 1 : 0);
        next.set(`${current}:${total}`, [current, total]);
      }
      partial = next;
    }
    for (const [last, count] of partial.values()) result.add(count + (last && first ? 1 : 0));
  }
  return sorted(result);
}

function possibleEvilCounts(players: boolean[][]): number[] {
  let counts = new Set([0]);
  for (const options of players) {
    const next = new Set<number>();
    for (const prior of counts) for (const evil of options) next.add(prior + (evil ? 1 : 0));
    counts = next;
  }
  return sorted(counts);
}

/** The open opening choices and first-night information for one seated roster. */
export function openingDomain(seats: DomainSeat[], hasDrunk: boolean, typeOf: (role: string) => RoleType) {
  const count = seats.length;
  const type = (s: DomainSeat) => typeOf(s.role);
  const good = (s: DomainSeat) => type(s) === 'townsfolk' || type(s) === 'outsider';
  const drunkSeats = hasDrunk ? seats.filter(s => type(s) === 'townsfolk').map(s => s.seat) : [];
  const inPlay = new Set(seats.map(s => s.role));
  if (hasDrunk) inPlay.add('drunk');

  const slots: Json[] = [];
  if (drunkSeats.length) slots.push({ slot: 'drunk', seats: drunkSeats });
  // The Red Herring is an actually good player who is not the Recluse; only a Fortune Teller needs one.
  if (inPlay.has('fortuneteller'))
    slots.push({ slot: 'redHerring', seats: seats.filter(s => good(s) && s.role !== 'recluse').map(s => s.seat) });
  // The Demon learns bluffs only with seven or more players.
  if (count >= 7) slots.push({ slot: 'demonBluffs', roles: GOOD_ROLE_ORDER.filter(r => !inPlay.has(r)) });

  const registrations = seats.map(s => evilRegistrations(s.role, type(s)));
  const townsfolkInPlay = [...new Set(seats.filter(s => type(s) === 'townsfolk').map(s => s.role))];
  const drunkNumberLimit = count >= 13 ? 4 : count >= 10 ? 3 : 2;

  const firstNightInfo = seats.flatMap((source, index): Json[] => {
    const candidate = drunkSeats.includes(source.seat);
    const head = { seat: source.seat, role: source.role };
    const answer = (open: boolean) => open ? 'ALWAYS' : candidate ? 'IF_DRUNK' : 'NEVER';
    if (source.role === 'fortuneteller') return [{ ...head, type: 'AFTER_PLAYER_CHOICE', answer: 'NEVER' }];
    if (source.role === 'chef' || source.role === 'empath') {
      const chef = source.role === 'chef';
      const neighbours = [...new Set([(index - 1 + count) % count, (index + 1) % count])].filter(i => i !== index);
      const truthful = chef ? adjacentEvilPairCounts(registrations)
        : possibleEvilCounts(neighbours.map(i => registrations[i]));
      const info: Json = { ...head, type: 'NUMBER', answer: answer(truthful.length > 1), truthful };
      if (candidate) info.ifDrunk = range(chef ? drunkNumberLimit : 2);
      return [info];
    }
    const kind = PAIR_KIND[source.role];
    if (!kind) return [];
    const others = seats.filter(s => s.seat !== source.seat);
    const truthful: Json[] = others.filter(s => type(s) === kind).map(s => ({ role: s.role, seat: s.seat }));
    if (source.role === 'librarian' && hasDrunk) truthful.push({ role: 'drunk', seat: 'DRUNK_SEAT' });
    // A Spy may be shown as a Townsfolk or Outsider, a Recluse as a Minion.
    const special = others.filter(s => kind === 'minion' ? s.role === 'recluse' : s.role === 'spy');
    const shownAs = kind === 'townsfolk' ? townsfolkInPlay : kind === 'outsider' ? OUTSIDER_ORDER : MINION_ORDER;
    const mayRegister = shownAs.length ? special.map(s => ({ seat: s.seat, roles: shownAs })) : [];
    const info: Json = { ...head, type: 'PAIR', answer: answer(truthful.length > 0 || mayRegister.length > 0), truthful };
    if (mayRegister.length) info.mayRegister = mayRegister;
    if (source.role === 'librarian' && !hasDrunk && !seats.some(s => type(s) === 'outsider')) info.noneTruthful = true;
    return [info];
  });
  return { slots, firstNightInfo };
}
