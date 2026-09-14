# Contributing to NeuroFly

NeuroFly is an OPEN SOURCE project! 

We welcome contributions from developers, researchers, neuroscientists, and enthusiasts. Whether you want to improve the WebGL visualization, refine the Brian2 spiking models, add new live data sources, or just fix bugs, your help is appreciated.

## How to Contribute

1. **Fork the Repository:** Create your own fork and branch off `main`.
2. **Set Up Locally:** Follow the instructions in `docs/SETUP.md` to get your local environment running.
3. **Make Changes:** Implement your feature or fix.
4. **Test:** Ensure you haven't broken the Python simulation layer or the Node.js API endpoints.
5. **Open a Pull Request:** Describe your changes clearly and explain any new dependencies.

## Scientific & Data Provenance Expectations

NeuroFly is built upon the real MaleCNS connectome. When contributing:
- **Do not alter the empirical structural data.** We do not support "synthetic" neuron connections inside the biological structure.
- **Do not commit large datasets.** The `.nbf` skeletons and sqlite results should remain in `.gitignore`.
- **Differentiate Model vs. Reality:** If you add a new metric (e.g. "Serotonin"), make sure it is explicitly documented as a *computational model state*, not a biological claim.

For deeper technical guidance on how the codebase is structured, please read `docs/DEVELOPMENT.md`.
