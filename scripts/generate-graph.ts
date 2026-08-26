// Generate github-readme-activity-graph as a static SVG.
// Runs inside a cloned github-readme-activity-graph repo.
// Usage: TOKEN=<gh token> npx tsx generate-graph.ts <username> <outdir>
import * as fs from 'fs';
import { execSync } from 'child_process';

async function main() {
    if (!process.env.TOKEN) {
        try {
            process.env.TOKEN = execSync('gh auth token').toString().trim();
        } catch {
            console.error('No TOKEN env and gh not authenticated');
            process.exit(1);
        }
    }
    const username = process.argv[2] || 'saketkumar-18';
    const outdir = process.argv[3] || 'dist';
    fs.mkdirSync(outdir, { recursive: true });

    const { Utilities } = await import('./src/utils');
    const { Fetcher } = await import('./src/fetcher');

    const query = {
        username,
        theme: 'react-dark',
        area: 'true',
        hide_border: 'true',
        color: '22d3ee',
        line: '7c3aed',
        point: 'f472b6',
        bg_color: '0d1117',
        days: '31',
        custom_title: `${username}'s Contribution Graph`,
    };

    const utils = new Utilities(query as any);
    const fetcher = new Fetcher(username);
    const opts = utils.queryOptions();
    const data = await fetcher.fetchContributions(opts.days, opts.from, opts.to);

    if (typeof data !== 'object') {
        console.error('FETCH FAILED:', data);
        process.exit(1);
    }

    const { finalGraph } = await utils.buildGraph(data);
    fs.writeFileSync(`${outdir}/activity-graph.svg`, finalGraph);
    console.log('wrote activity-graph.svg');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
