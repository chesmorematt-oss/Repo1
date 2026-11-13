# IndeeCheck — City of Independence, IA Planning, Zoning, Floodplain & Fence Compliance Workbench

Full-stack municipal permit checklist and live ordinance comparison platform built for **Independence, Buchanan County, Iowa (50644)** planners, building & code enforcement officials, contractors, and property owners.

## Ordinance Coverage

1. **Independence Planning & Zoning Ordinance (`IMC Ch. 170` / Zoning Ordinance Ninth Revision Nov 2025, Articles 1–5)**
   - **Article 2 (§ 2.00)**: All municipal districts (`A-1`, `R-1`, `R-2`, `R-3`, `R-4`, `R/C-1`, `C-1`, `C-2`, `M-1`, `M-2`).
   - **Article 5 (§ 5.00 Table 1 Bulk Requirements)**: Automated comparisons for minimum lot area (`10,000 sq ft` sewered / `30,000 sq ft` unsewered in `R-1`; `7,000` / `8,000 sq ft` in `R-2`), lot width, maximum height (`35 ft` or `3 stories`, whichever is lower), front, interior side, corner street-side (`§ 3.12`), and rear setbacks.
   - **R/C-1 Hybrid District Rule**: Automatically applies `R-2` bulk rules to residential uses and commercial uses adjoining `"R"` districts, and `C-2` rules otherwise.
   - **Table 1 Note 2 Residential Buffer**: Enforces `>= 15 ft` buffer yard where `C-1`, `C-2`, `M-1`, or `M-2` parcels adjoin any `"R"` district.
   - **Accessory Buildings (`§ 3.10` & Table 1 Notes 4–6)**: Enforces `<= 18 ft` (1-story) height cap, `>= 4.0 ft` reduced side/rear yard setback, and `<= 30%` rear yard coverage.

2. **Flood Plain Ordinance (`IMC Chapter 167` & Zoning Ordinance `Article 4: Flood Plain Regulations`)**
   - **Wapsipinicon River & Tributary FEMA FIRM Zones (`§ 4.04`)**: Evaluates Zones `X`, `X_500` (`0.2%`), `A`, `AE`, and Regulatory `FLOODWAY`.
   - **Lowest Floor Freeboard (`Ch. 167` / `§ 4.17`)**: Verifies proposed lowest floor `>= BFE + 1.0 ft` NAVD88 and checks `>= 50%` Substantial Improvement thresholds (`§ 4.21`).
   - **Sub-BFE Enclosures & +3.0-Ft Machinery Rule (`§ 4.02.14(a)–(d)`)**: Prohibits subgrade basements in SFHA and verifies furnace, water heater, and electrical service inside enclosed unfinished vented areas sit `>= BFE + 3.0 ft`.
   - **Regulatory Floodway & 92 FEMA Buyout Parcels (`44 CFR § 80.19`)**: Flags zero-rise (`0.00 ft`) certification requirements and deed-restricted hazard-mitigation open-space parcels.

3. **Fence Ordinance (`IMC Chapter 152: Fences, Walls and Hedges` & Zoning `§§ 1.04.44–1.04.45`)**
   - **Corner Lot Vision Clearance Triangle (`IMC § 152.01` & `Fig. 4C`)**: Enforces `<= 3' 0"` (`36"`) height limit within the `20 ft × 20 ft` street intersection sight triangle.
   - **Yard Height Caps (`IMC § 152.02`)**: Enforces `<= 4' 0"` in required front yards and `<= 6' 6"` in required side and rear yards.
   - **3-Foot Lot-Line Setback & Neighbor Fence Agreement (`IMC § 152.02`)**: Requires `>= 3.0 ft` setback from side/rear property lines unless a signed **Neighbor Fence Agreement** is filed with the City Building Official.
   - **Permits & Approved Materials (`IMC § 152.03` & `§§ 1.04.44–45`)**: Tracks written permit application, Iowa One Call (`811`) locate ticket, bans corrugated sheet metal, barbed wire, and salvage material in `"R"` districts, and enforces `>= 6' 0"` barbed-wire height in commercial/industrial districts.

## Tech Stack & Running Locally

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons, custom SVG Parcel & Floodplain Cross-Section schematics
- **Backend**: Node.js 22, Express, built-in `node:sqlite` (`WAL` mode, stored in `data/indeecheck.sqlite`) — opens directly into the workspace with no login or authentication barrier.

```bash
npm install
npm run dev              # Starts unified Express API + Vite server on 0.0.0.0:3000
npm run install:desktop  # Creates a native Desktop launcher icon (Windows .lnk / macOS .app / Linux .desktop)
npm run build            # Builds frontend bundle to dist/
npm start                # Runs production server on 0.0.0.0:3000
```

## Installing on Your Desktop (with Official City of Independence Icon)

IndeeCheck supports three ways to install a standalone desktop application with the official **City of Independence Planning & Zoning** icon (`public/indeecheck.ico` and `public/icons/icon-512.png`):

1. **In-App Desktop Installer Modal**: Click **Install Desktop App** in the left sidebar, dashboard header, or login portal to trigger a 1-click browser PWA install or download a ready-to-run OS launcher (`Install-IndeeCheck-Desktop.bat` for Windows, `Install-IndeeCheck-Mac.command` for macOS, or `IndeeCheck.desktop` for Linux).
2. **Browser PWA Install (Edge / Chrome / Safari)**: Open IndeeCheck in a full browser tab and click the **Install IndeeCheck** icon in the address bar (or **File → Add to Dock...** in Safari) to install a standalone desktop window with Desktop, Start Menu, and Taskbar/Dock shortcuts.
3. **Local Repository Desktop Shortcut (`npm run install:desktop`)**: When running locally from a cloned repository, run `npm run install:desktop` to create a native launcher with icon on your Desktop that automatically starts the local server if needed and opens IndeeCheck in standalone app mode.
