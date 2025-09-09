useEffect(() => {
  if (currentSessionId) {
    loadSessionIfNeeded(currentSessionId);
  }
}, [currentSessionId, loadSessionIfNeeded]); // 问题在这里！