/* SafetyCheck data — trades, checklists, PPE, toolbox talks. Browser + node. */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else root.SafetyCheck = Object.assign(root.SafetyCheck || {}, factory());
})(typeof self !== "undefined" ? self : this, function () {

  var TRADES = [
    {
      id: "construction", name: "General Construction", icon: "🏗️",
      daily: [
        "Inspect hard hat, hi-vis vest, and boots before shift",
        "Walk the site for slip, trip, and fall hazards",
        "Check ladders and scaffolds for damage before climbing",
        "Verify guardrails on leading edges and openings",
        "Confirm fire extinguisher locations with the crew",
        "Hold toolbox talk and collect crew sign-in"
      ],
      weekly: [
        "Inspect every ladder; tag and remove damaged ones",
        "Check first-aid kit is stocked and accessible",
        "Review emergency assembly point with the crew",
        "Inspect power cords and tools for damage",
        "Housekeeping sweep of laydown and material areas"
      ],
      ppe: ["Hard hat (ANSI Z89.1)", "Hi-vis vest Class 2", "Steel/composite-toe boots", "Safety glasses", "Work gloves", "Hearing protection"]
    },
    {
      id: "electrical", name: "Electrical", icon: "⚡",
      daily: [
        "Lockout/tagout kit on hand before starting work",
        "Verify GFCI protection on temporary power",
        "Check insulated tools are rated for the voltage",
        "Confirm panel schedules and labeling are legible",
        "De-energize and test-before-touch on every circuit",
        "Arc-flash PPE selected for the task at hand"
      ],
      weekly: [
        "Inspect extension cords for cuts and exposed wire",
        "Test all GFCIs (press test/reset buttons)",
        "Review one-line drawings for upcoming work",
        "Air-test insulated gloves; check date stamps",
        "Verify meter/tester calibration dates are current"
      ],
      ppe: ["Insulated gloves (rated class)", "Arc-rated face shield", "Safety glasses", "Voltage-rated hand tools", "Dielectric boots", "Hard hat"]
    },
    {
      id: "plumbing", name: "Plumbing", icon: "🔧",
      daily: [
        "Sniff-test / check for gas leaks before any hot work",
        "Eye protection on for cutting, drilling, grinding",
        "Gloves on — pipe edges and hangers are sharp",
        "Ventilate confined or low areas before entering",
        "Secure ladders on wet or slick surfaces",
        "Confirm water/gas shutoffs are labeled and accessible"
      ],
      weekly: [
        "Inspect torches, hoses, and regulators for leaks",
        "Check drain-machine cables for kinks and fraying",
        "Review SDS for drain cleaners and solvents on the truck",
        "Inspect kneepads and gloves; replace worn pairs",
        "Flush eyewash bottles / check eyewash station"
      ],
      ppe: ["Safety glasses or goggles", "Cut-resistant gloves", "Knee pads", "Steel-toe boots", "Respirator (soldering fumes)", "Hearing protection"]
    },
    {
      id: "hvac", name: "HVAC", icon: "❄️",
      daily: [
        "Lockout/tagout equipment before servicing",
        "Refrigerant-handling PPE and recovery gear ready",
        "Ladder secured for rooftop or attic access",
        "Test disconnects — verify zero energy before touching",
        "Fall protection in place near roof edges and openings",
        "Ventilate areas where brazing or soldering"
      ],
      weekly: [
        "Inspect manifold gauges and hoses for cracks",
        "Check refrigerant recovery equipment operation",
        "Review SDS for refrigerants and cleaners used",
        "Inspect roof anchor points and lifelines",
        "Restock van: filters, fuses, common wear parts"
      ],
      ppe: ["Safety glasses", "Cut-resistant gloves", "Hard hat (rooftop work)", "Full-body harness + lanyard", "Steel-toe boots", "Half-face respirator"]
    },
    {
      id: "roofing", name: "Roofing", icon: "🏠",
      daily: [
        "Review today's fall protection plan with the crew",
        "Inspect anchor points before anyone ties off",
        "Check weather and wind — stop work if unsafe",
        "Heat plan in place: water, shade, rest breaks",
        "Ladders tied off and extending 3 ft past the eave",
        "Keep the roof deck clear of debris and trip hazards"
      ],
      weekly: [
        "Inspect every harness and lanyard; retire damaged gear",
        "Check guardrail and warning-line systems",
        "Review heat-illness signs and response with crew",
        "Inspect nail guns, compressors, and hoses",
        "Clean up and reorganize material staging areas"
      ],
      ppe: ["Full-body harness", "Shock-absorbing lanyard or SRL", "Hard hat", "Slip-resistant boots", "Safety glasses", "Work gloves"]
    },
    {
      id: "welding", name: "Welding & Hot Work", icon: "🔥",
      daily: [
        "Hot work permit signed and posted",
        "Fire watch assigned and briefed",
        "35-foot radius clear of combustibles (or shielded)",
        "Ventilation / fume extraction running",
        "Gas cylinders secured upright, caps on when not in use",
        "PPE check: helmet, jacket, gloves, boots"
      ],
      weekly: [
        "Inspect welding leads, grounds, and connections",
        "Check regulator gauges and flashback arrestors",
        "Review SDS for rods, fluxes, and coatings",
        "Inspect fire extinguishers (charged, accessible)",
        "Clean shop ventilation filters and screens"
      ],
      ppe: ["Welding helmet (correct shade)", "Flame-resistant jacket", "Welding gloves", "Safety glasses under hood", "Respirator (as needed)", "Steel-toe boots"]
    },
    {
      id: "warehouse", name: "Warehouse & Forklift", icon: "📦",
      daily: [
        "Forklift pre-shift inspection (checklist signed)",
        "Pedestrian walkways clear and marked",
        "Rack aisles clear of pallets and debris",
        "Dock plates secured, trailer chocks in place",
        "Hi-vis and boots on before entering the floor",
        "Report spills and clean up immediately"
      ],
      weekly: [
        "Inspect racking uprights and beams for damage",
        "Verify fire exits and extinguishers are accessible",
        "Test dock levelers, doors, and restraints",
        "Review the near-miss log with the team",
        "Inspect pallet jacks and hand trucks"
      ],
      ppe: ["Hi-vis vest", "Steel-toe boots", "Safety glasses", "Work gloves", "Hard hat (loading areas)", "Back support (optional)"]
    },
    {
      id: "landscaping", name: "Landscaping & Grounds", icon: "🌳",
      daily: [
        "Inspect mowers and trimmers before fueling",
        "Eye and hearing protection on before starting equipment",
        "Call 811 / verify utilities before any digging",
        "Heat plan: water on the truck, shade breaks",
        "Blade guards and deflectors in place",
        "Fuel stored in approved cans, no smoking near fuel"
      ],
      weekly: [
        "Sharpen and inspect mower blades",
        "Check trailer tie-downs, lights, and tires",
        "Review pesticide/fertilizer labels and PPE",
        "Inspect chainsaw chain tension and brake",
        "Clean or replace equipment air filters"
      ],
      ppe: ["Safety glasses", "Hearing protection", "Steel-toe boots", "Work gloves", "Hi-vis vest (roadside work)", "Chainsaw chaps (when sawing)"]
    }
  ];

  var TALKS = [
    { t: "Ladder safety", p: ["Maintain three points of contact at all times.", "Set extension ladders at a 4:1 angle — 1 ft out for every 4 ft up.", "Inspect rails, rungs, and feet before every climb; tag damaged ladders out."] },
    { t: "Fall protection harnesses", p: ["Inspect webbing, stitching, and D-rings before each use.", "Anchor to a rated point capable of 5,000 lbs per worker.", "Know the rescue plan — suspension trauma can kill in under 30 minutes."] },
    { t: "Hard hats", p: ["Inspect the shell and suspension for cracks before each shift.", "Replace any hard hat that took an impact — damage hides inside.", "Wear the brim forward unless the task requires reversing it."] },
    { t: "Eye protection", p: ["Match the lens to the hazard: impact, dust, chemical, or UV.", "Side shields matter — debris rarely comes straight on.", "Scratched or pitted lenses get replaced, not tolerated."] },
    { t: "Hearing protection", p: ["Wear it when you must shout to be heard at arm's length (~85 dB).", "Roll foam plugs, pull the ear up and back, hold until expanded.", "Muffs go over safety glasses — check the seal around the arms."] },
    { t: "Choosing the right gloves", p: ["Cut, chemical, heat, and impact each need a different glove.", "Inspect for holes and thinning before every use.", "Never wear loose gloves or cuffs near rotating machinery."] },
    { t: "Hi-vis clothing", p: ["Class 2 minimum near traffic or mobile equipment.", "Dirty or faded vests lose reflectivity — wash and replace.", "Dusk, dawn, and night work demand full hi-vis, not just a vest."] },
    { t: "Respiratory protection", p: ["Dust masks for nuisance dust; half-face respirators for real hazards.", "Do a seal check every time you put it on.", "Facial hair breaks the seal — fit-test clean-shaven."] },
    { t: "Heat stress", p: ["Water, rest, shade — every job, every hot day.", "Know the signs: confusion and hot dry skin mean call 911.", "Use the buddy system; heat stroke victims can't self-rescue."] },
    { t: "Cold stress", p: ["Dress in layers you can vent as you work.", "Watch for white, waxy skin — early frostbite.", "Schedule warm breaks; cold hands make mistakes."] },
    { t: "Housekeeping", p: ["A clean site is a safe site — clear walkways first.", "Coil cords and hoses; never leave them across paths.", "Clean as you go beats a Friday scramble."] },
    { t: "Slips, trips, and falls", p: ["Wet surfaces, loose cords, and poor lighting cause most falls.", "Take the long way around rather than cutting through clutter.", "Report the hazard you almost tripped on — next person might not catch it."] },
    { t: "Hand and power tool inspection", p: ["Check cords, guards, and handles before first use.", "Damaged tools get tagged out — never 'just for one cut'.", "Use the right tool; improvising causes most tool injuries."] },
    { t: "Power tool safety", p: ["Unplug or remove the battery before changing bits or blades.", "Two hands on the tool, both feet planted.", "Eye protection is non-negotiable with power tools."] },
    { t: "Extension cord safety", p: ["Size the cord to the load — undersized cords overheat.", "Never daisy-chain cords or run them through doorways.", "Outdoors and wet areas demand GFCI protection."] },
    { t: "Lockout/tagout basics", p: ["De-energize, lock it, tag it — every time.", "Test before you touch: verify zero energy with your meter.", "Only the person who applied the lock removes it."] },
    { t: "GFCI protection", p: ["Use GFCIs on all outdoor and wet-location circuits.", "Test monthly with the test/reset buttons.", "A tripping GFCI is warning you — find the fault, don't bypass it."] },
    { t: "Overhead power lines", p: ["Keep 10 feet minimum from overhead lines.", "Use a spotter when operating equipment near lines.", "If equipment contacts a line, stay in the cab and call the utility."] },
    { t: "Trenching and excavation", p: ["Cave-in protection required at 5 feet and deeper.", "Keep spoil piles at least 2 feet from the edge.", "A ladder every 25 feet of lateral travel — no jumping in or out."] },
    { t: "Scaffold safety", p: ["Only a competent person erects, moves, or alters scaffolds.", "Guardrails on all open sides 10 feet or higher.", "Keep scaffolds plumb, level, and fully planked."] },
    { t: "Aerial lift safety", p: ["Tie off to the boom or basket anchor — never to adjacent structures.", "Feet stay on the floor; never climb the rails.", "Look up and around for overhead hazards before elevating."] },
    { t: "Crane and hoist signals", p: ["Agree on standard hand signals before the first pick.", "Never stand under a suspended load — no exceptions.", "Use tag lines to control swinging loads."] },
    { t: "Rigging basics", p: ["Inspect slings before every lift; remove damaged ones.", "Know the load weight — never guess.", "Sling angle matters: the shallower the angle, the higher the tension."] },
    { t: "Forklift safety", p: ["Pedestrians always have the right of way.", "No riders — ever, on any part of the truck.", "Park with forks lowered, controls neutral, brake set."] },
    { t: "Backing vehicles safely", p: ["Do a 360° walk-around before backing up.", "Use a spotter whenever visibility is limited.", "Back in on arrival so you can pull out forward."] },
    { t: "Seat belts in equipment", p: ["ROPS only protects you if you're belted inside it.", "Stay in the cab during a tip-over — don't jump.", "Buckle up even for short moves across the site."] },
    { t: "Reading chemical labels (GHS)", p: ["Check the pictograms before you open any container.", "Read the SDS section on PPE and first aid.", "Never mix chemicals unless the label says you can."] },
    { t: "Flammable liquid storage", p: ["Store in approved cabinets, away from ignition sources.", "Bond and ground when dispensing.", "Keep containers closed when not in use."] },
    { t: "Compressed gas cylinders", p: ["Secure upright with a chain or strap — always.", "Caps on when moving or storing.", "Separate full from empty; separate fuel gases from oxygen."] },
    { t: "Welding fume safety", p: ["Position yourself upwind of the plume.", "Use local exhaust ventilation when available.", "Wear a respirator when welding coated or galvanized metals."] },
    { t: "Hot work permits", p: ["No permit, no hot work — no exceptions.", "Maintain a fire watch during and 60 minutes after.", "Have an extinguisher within reach, not across the shop."] },
    { t: "Fire extinguisher use (PASS)", p: ["Pull the pin, Aim low, Squeeze, Sweep side to side.", "Match the extinguisher class to the fire.", "If the fire doesn't shrink in seconds, get out and call 911."] },
    { t: "Emergency exits and evacuation", p: ["Know two ways out of every area you work in.", "Keep exits and aisles clear — always.", "Know your assembly point before the alarm sounds."] },
    { t: "First aid basics", p: ["Know where the kit and AED are on every site.", "Control bleeding with direct pressure.", "Call for help early — don't wait to see if it gets worse."] },
    { t: "Bloodborne pathogens", p: ["Wear gloves for any blood or bodily fluid cleanup.", "Use the spill kit — don't improvise with rags.", "Report every exposure, even minor ones."] },
    { t: "Safe lifting and ergonomics", p: ["Bend the knees, keep the load close, lift with the legs.", "Team-lift anything awkward or over 50 lbs.", "Pivot with your feet — never twist while carrying."] },
    { t: "Preventing repetitive strain", p: ["Take micro-breaks and stretch during repetitive tasks.", "Use tools with padded, properly sized handles.", "Alternate hands and tasks when possible."] },
    { t: "Hand tool safety", p: ["Sharp beats dull — dull blades need force and slip.", "Cut away from your body, always.", "Carry pointed tools point-down at your side."] },
    { t: "Angle grinder safety", p: ["Guard stays on — removal is never acceptable.", "Use only discs rated at or above the grinder's RPM.", "Wear a face shield, not just glasses, when grinding."] },
    { t: "Nail gun safety", p: ["Use sequential-trip mode unless the job truly needs contact trip.", "Disconnect air before clearing jams.", "Never bypass or tape down the safety contact."] },
    { t: "Silica dust (concrete/masonry)", p: ["Silica dust causes permanent lung damage — take it seriously.", "Use wet cutting or vacuum dust collection.", "Wear a respirator when dust is visible in the air."] },
    { t: "Noise on the jobsite", p: ["Choose quieter equipment when you have the option.", "Distance is protection — step back from loud sources.", "Wear hearing protection before your ears ring, not after."] },
    { t: "Fighting fatigue", p: ["Fatigue slows reactions like alcohol does.", "Recognize the signs: yawning, heavy eyes, mistakes.", "Speak up if you're too tired to work safely — it's respected here."] },
    { t: "Distracted walking", p: ["Phones down when walking the site.", "Make eye contact with equipment operators before crossing.", "Situational awareness is a skill — practice it."] },
    { t: "Working alone", p: ["Have a check-in plan and stick to it.", "Keep your phone charged and on you.", "Tell someone where you are and when you'll be back."] },
    { t: "New worker orientation", p: ["Ask questions — there are no dumb ones on day one.", "You have stop-work authority from your first hour.", "Stick with your mentor until tasks feel routine."] },
    { t: "Stop-work authority", p: ["Anyone can stop unsafe work — no permission needed.", "Stopping work is never punished here.", "Restart only after the hazard is fixed and everyone's briefed."] },
    { t: "Near-miss reporting", p: ["A near miss is a free lesson — report it.", "Fix the root cause, not just the symptom.", "Share the lesson so the next crew doesn't repeat it."] },
    { t: "Incident investigation", p: ["Stick to facts, not blame — blame hides causes.", "Ask 'why' five times to reach the root cause.", "Every investigation ends with a corrective action and an owner."] },
    { t: "PPE inspection day", p: ["Bring all your PPE — we inspect together.", "Look for cracks, fraying, and expired dates.", "Damaged PPE gets replaced today, not 'soon'."] },
    { t: "Winter site conditions", p: ["Treat every wet surface as ice until proven otherwise.", "Shorter days mean planning for lighting.", "Cold tools and materials behave differently — slow down."] },
    { t: "Summer heat kickoff", p: ["Acclimatize: ramp up over 7–14 days.", "Set up hydration stations before the heat does.", "Review heat-illness signs with the whole crew today."] }
  ];

  var INCIDENT_TYPES = ["Near miss", "First aid", "Recordable injury", "Property damage", "Environmental", "Other"];

  return { TRADES: TRADES, TALKS: TALKS, INCIDENT_TYPES: INCIDENT_TYPES };
});