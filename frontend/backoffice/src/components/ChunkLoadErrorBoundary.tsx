import { Component, type ReactNode } from 'react';
import { isChunkLoadError, reloadOnceForStaleChunks } from 'utils/chunkLoadRecovery';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

class ChunkLoadErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    if (isChunkLoadError(error)) {
      reloadOnceForStaleChunks();
    }
  }

  render() {
    const { error } = this.state;

    if (error) {
      if (isChunkLoadError(error)) {
        return null;
      }

      throw error;
    }

    return this.props.children;
  }
}

export default ChunkLoadErrorBoundary;
