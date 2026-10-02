// Prints the payload tree a release review must name for a candidate commit:
// the commit's root tree with the review-evidence directory removed.
//
//   npm run review:payload-tree            # HEAD
//   npm run review:payload-tree -- <rev>   # any commit-ish
import { payloadTree } from './release-review-binding.mjs';

process.stdout.write(
  `${payloadTree({ cwd: process.cwd(), treeish: process.argv[2] ?? 'HEAD' })}\n`,
);
