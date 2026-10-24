# Maintenance day: v2.28.1 (2026-10-24)

## Scope
Semih's request: "Assetler, kurgu, kural, geliştirilebilecek alanlar, eklenebilecek özellikler" (assets, game design, rules,
areas to improve, features to add). Item 8 (logistics tiers) is postponed.

## How the audit was done
`/workspace/scratch/p281/audit.py` plays the game on desktop (1280×800) and an iPhone 13 at four stages:
1. a fresh game;
2. 6 minutes into run 1 (greedy sim);
3. right after the 3rd Replant;
4. late game (every building level 45–145, all research, premium open).

At each stage it:
- screenshots the fit view and every sheet;
- scans the sheet text for NaN, undefined, Infinity, null or negative money;
- checks that no element sticks out past a phone screen;
- records console errors.

Other checks:
- `saves.py` loads 9 damaged or odd saves.
- Balance: `bal.py` (late greedy player over 4 Replants) and `test/balance.py` (early-game bot) on v2.28 against the fixes.
- All 37 test files.

## Fixed in v2.28.1
| Area | Problem found | Fix |
|---|---|---|
| Mobile UI | Market table ran 23 px off a phone in late game (long names such as "Timber-frame Houses"). The Sell buttons were cut off. | On phones, names wrap and cell padding is tighter. |
| Mobile UI | Toasts (run goals, events) covered the title and ✕ of a full-height sheet. | With a full sheet open, toasts stack above the bottom bar. |
| Scene | "⚙️ Machine breakdown" callouts could hang over lots that a Replant had just emptied. | Callouts for buildings at Lv 0 are dropped; at most 4 show at once. |
| Saves | A damaged save with `"buildings":null` crashed the game every tick. Text or Infinity coins and negative levels loaded as-is. | `merge()` will not swap an object or number for the wrong type. New `sanitizeState()` clamps levels, stocks and coins. |
| Rules / text | The Replant card said the same thing twice ("Requires 15.8M…" and "First Seeds at 15.8M…"). | The second line now shows progress ("… · 42% there"). |
| Rules / text | The *Export Contracts* upgrade had the same name as the Shipping Yard's export contracts. | Renamed to **Export Licence**; the effect is unchanged. |
| Rules / text | *Masterworks* said "luxury goods" but boosts plywood, toys, boats, cabinets and luxury furniture. | The description now lists exactly what it boosts. |
| Balance | Open v2.24 note: premium workshops were held back by paper and chairs. | Paper Mill uses 30 chips per batch instead of 40; Luxury Showroom 2 chairs instead of 4. Results are in the table below. |
| Tests | `v20` click checks failed because opening a sheet pans the camera. `v12`/`v26` still used pre-v2.27 dock and office positions. | Fixed in v2.28. v2.28.1 adds `test/v2281.py` for the fixes above. |

### Balance results (`bal.py`, seed 1, 4 Replants, late greedy player)
| | v2.28 | v2.28.1 |
|---|---|---|
| Earned, run 4 | 6.67e14 | 7.28e14 (+9 %) |
| Research Lab paper-bound | 100 % | 91 % |
| Stationery paper-bound | 100 % | 91 % |

- The early-game bot (`test/balance.py`) is within run-to-run noise. Only late, premium-side inputs changed.
- Two tweaks were tried and dropped:
  - A Wood Chipper at 2× speed made the first 5 minutes about 10× faster, which is not low-risk.
  - A Boat Yard at 1 chair made boats faster, and the extra boats starved plywood again (the `v224` plywood check fell to 15–19 %).

## (a) Improvement areas found but not fixed
In priority order, with the reason each was left:

1. **Structural chip and chair shortage.**
   - The greedy sim shows Pellet Press and Paper Mill chips-bound, and Cabinets, Showroom and Boat Yard chairs-bound, whenever
     every building is levelled evenly.
   - Fixing it properly means changing early recipes (Chipper, Carpentry), which changes the first minutes of every run.
   - *Better:* a "bottleneck" hint in the building sheet ("Upgrade the Wood Chipper: +X/s for Pellet Press and Paper Mill").
     That needs UI work.
2. **Late veneer surplus (v2.24 note).**
   - The Peeler is never input-bound, and spare veneer sells at $3.5.
   - It is harmless, but it is a dead end. A veneer consumer (for example a Veneer Dryer station, or decor panels) is a feature.
3. **Plywood becomes the late bottleneck after this release.**
   - Parquet, Toy Workshop and Timber-frame Houses all wait on the Plywood Mill, which needs research to unlock.
   - Watch it; a Plywood Mill station or a manager perk would fix it. This is also why the Boat Yard keeps 2 chairs.
4. **Chopping upgrades are dead late.**
   - *Golden Axe* (×5 chop) and *Sharper Axes* barely matter once collectors run, because clicks are tiny next to the income.
   - Making them scale with logs/s would change their role. That is a design call.
5. **Name clash ahead.**
   - The *Global Logistics* upgrade and the *Trade Logistics* research both say "logistics", and item 8 will add "logistics tiers".
   - Rename them when item 8 lands, so the new system owns the word.
6. **No upgrades for the newer lines.**
   - The Veneer Peeler, Plywood Mill, Beam Saw and Glulam Plant have workstations and research, but no ×2 upgrade like the older
     lines. That is new content and changes balance.
7. **Onboarding.**
   - A fresh game opens on 16 locked lots with "Earn 2.00K" style tags. The only call to action is "Build: 0/40 logs" on the
     Sawmill. There is no pointer to "tap the forest to chop".
8. **Mobile clutter at late game.**
   - The premium order card, two or three toasts, the event bar, the jump, upgrade and alert buttons and the lot tags all compete
     for space.
   - Needs a priority/stacking rule rather than a CSS tweak.
9. **The fit view on phones leaves out the Shipping dock** (helper strip, v2.27). The Dock chip reaches it, but a new player
   may not find it.
10. **Test speed.** The suite takes about 10 minutes on 4 workers.
    - `v28` (perf) and `v225` (timing) are still sensitive to machine load and pass when rerun alone.
    - A deterministic clock (`TT.simulate`) instead of `wait_for_timeout` in those checks would make them stable.

## (b) New feature ideas
Effort: S ≈ a day, M ≈ 2–3 days, L ≈ a week or more.

| # | Idea | Pitch | Player value | Effort |
|---|---|---|---|---|
| 1 | **Bottleneck Advisor** | A "Fix the chain" card shows the one upgrade that unblocks the most income right now (from `bstat.lim` and the flow edges). | Turns the paper/chairs/chips puzzle into a clear next step; good for new players. | S |
| 2 | **Logistics tiers (item 8)** | Forklift, truck and rail capacity tiers that cap how fast goods move between phases and to the dock. | A new progression axis that uses the existing fleets and the bent highway. | L |
| 3 | **Replant Blueprints** | Before a Replant, save the build order of up to 3 lines; the next run auto-builds them as coins allow. | Cuts the repetitive early clicking of every run. Fits Replant 2.0 and the Builders' Yard. | M |
| 4 | **Veneer & Decor line** | A Phase 2 *Decor Panels* workshop (veneer + glue → panels) feeding a Phase 3 *Interior Fit-out* (panels + cabinets). | Uses the late veneer surplus and gives Timber-frame Houses an upscale sibling. | M |
| 5 | **Workstation sets** | Owning all 3 workstations of a building at Lv 5/10 gives a set bonus (for example, managers' perks doubled). | A mid-term goal for the stations system and a reason to max one line. | S |
| 6 | **Research "Specialist" branches** | At tier 5, pick one of two mutually exclusive capstones per branch (for example mass production vs boutique prices). Re-pick on Replant. | Meaningful choice and different builds per run. | M |
| 7 | **Insurance claims & safety drills** | Mishaps leave a claim you can file (mini-decision: payout now or a premium discount). Drills cut setback odds for a while. | Makes bad luck a decision, not only a loss. | S |
| 8 | **Order chains** | Multi-step clients (houses → furniture → cabinets for the same chalet project) with a bigger final reward and a story line. | Story ("kurgu") and a reason to keep several premium lines running. | M |
| 9 | **Seasonal contracts** | Each season brings a themed export contract with a trophy (winter: pellets and charcoal; spring: houses). | Ties the world clock and weather into goals; good for daily play. | S |
| 10 | **Town growth** | Delivered Timber-frame Houses appear as a small village by the south gate; more houses bring more market-van demand. | Visible progress and a world that reacts to the new top product. | M |
| 11 | **Staff careers** | Trained staff can be promoted to foremen who run a whole phase column (small aura bonus, a name tag in the world). | Gives the staff system a long-term arc. | M |
| 12 | **Photo mode / share card** | One tap hides the UI and frames the whole factory with a stats banner, ready to share. | Low cost, good for showing off the art. | S |

### Suggested order
1. Bottleneck Advisor (1), Workstation sets (5), Seasonal contracts (9): quick, high value, low risk.
2. Then item 8, logistics tiers (2).
3. Then Veneer & Decor (4) or Order chains (8) for content.
