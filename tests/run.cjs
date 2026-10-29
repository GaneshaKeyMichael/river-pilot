// Single-process runner also works where child-process spawning is restricted.
for(const file of ['shoreline-physics.cjs','shoreline-geometry.cjs','br-control-tests.cjs','fanboat-physics-tests.cjs','br-anchor-jump-integration-tests.cjs','imagery-loading.cjs','camera-terrain.cjs','terrain-detail.cjs'])require('./'+file);
