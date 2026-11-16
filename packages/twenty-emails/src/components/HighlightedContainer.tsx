import { Column, Container, Row } from 'react-email';
import React, { type JSX } from 'react';

type HighlightedContainerProps = {
  children: JSX.Element | JSX.Element[] | string;
};

export const HighlightedContainer = ({
  children,
}: HighlightedContainerProps) => {
  return (
    <Container className="rounded-md border border-solid border-outline bg-highlight px-12 py-6">
      {React.Children.map(children, (child) => (
        <Row>
          <Column align="center">{child}</Column>
        </Row>
      ))}
    </Container>
  );
};
