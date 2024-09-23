import React, { Component } from 'react';
import { logError } from '../../util/petitionHandler';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    componentDidCatch(error, info) {
        logError(error, info.componentStack);
        this.setState({ hasError: true });
    }

    render() {
        if (this.state.hasError) {
            return <h1>App is currently under maintenance. Check back later.</h1>;
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
