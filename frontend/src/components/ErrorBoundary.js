import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      resetKey: props.resetKey,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey && state.hasError) {
      return {
        hasError: false,
        error: null,
        resetKey: props.resetKey,
      };
    }

    if (props.resetKey !== state.resetKey) {
      return {
        resetKey: props.resetKey,
      };
    }

    return null;
  }

  componentDidCatch(error, info) {
    console.error('FTMS page error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoDashboard = () => {
    this.setState({ hasError: false, error: null });

    if (this.props.onRecover) {
      this.props.onRecover();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const message =
      this.state.error?.message ||
      'This workspace could not be displayed because an unexpected error occurred.';

    return (
      <div className="system-error-card" role="alert">
        <span>Workspace Recovery</span>
        <h2>Something went wrong in this page</h2>
        <p>{message}</p>
        <div>
          <button type="button" onClick={this.handleGoDashboard}>
            Go to dashboard
          </button>
          <button type="button" className="secondary" onClick={this.handleReload}>
            Reload system
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
