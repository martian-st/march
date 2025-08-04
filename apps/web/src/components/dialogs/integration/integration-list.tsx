import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import useGoogleCalendarLogin from "@/hooks/use-calendar-login";
import { getIntegrations, Integration } from "@/lib/integrations";
import { useUser } from "@/hooks/use-user";
// import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import useGmail from "@/hooks/use-gmail-login";
import { useLinearLogin } from "@/hooks/use-linear-login";
import { useGithubInstall } from "@/hooks/use-github-install";
import { Icons } from "@/components/ui/icons";
import { useXLogin } from "@/hooks/use-x-login";

const IntegrationsList = () => {
  const [isDisconnecting, setIsDisconnecting] = useState<number | null>(null);
  const { data: user, refreshUser } = useUser();
  // const { handleCalendarLogin, handleRevokeAccess } =
  //   useGoogleCalendarLogin("/agenda");
  const { handleGmailLogin, handleGmailRevoke } = useGmail("/agenda");
  const { handleLinearLogin, handleLinearRevoke } = useLinearLogin("/agenda");
  const { handleGithubInstall } = useGithubInstall();
  const { handleXLogin } = useXLogin("/agenda");

  if (!user) {
    return null;
  }

  const integrations = getIntegrations(
    {
      // calendarConnectHandler: handleCalendarLogin,
      // calendarDisconnectHandler: handleRevokeAccess,
        // gmailConnectHandler: handleGmailLogin,
        // gmailDisconnectHandler: handleGmailRevoke,
      linearConnectHandler: handleLinearLogin,
      linearDisconnectHandler: handleLinearRevoke,
      githubConnectHandler: handleGithubInstall,
      xConnectHandler: handleXLogin,
    },
    user
  );

  const handleIntegrationAction = async (integration: Integration) => {
    if (!integration.handler) return;

    try {
      if (integration.isConnected) {
        setIsDisconnecting(integration.id);
        await integration.handler();
      } else {
        await integration.handler();
      }
      await refreshUser();
    } catch (error) {
      console.error(error);
    } finally {
      setIsDisconnecting(null);
    }
  };

  const renderIcon = (integration: Integration) => {
    const Icon = Icons[integration.icon];
    return <Icon className="h-5 w-5" />;
  };

  return (
    <>
      {integrations.map((integration) => (
        <div key={integration.id} className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {renderIcon(integration)}
            <span>{integration.title}</span>
          </div>
          <Button
            variant={integration.isConnected ? "default" : "outline"}
            onClick={() => handleIntegrationAction(integration)}
            disabled={isDisconnecting === integration.id}
            className="w-20 h-7"
          >
            {isDisconnecting === integration.id ? (
              <Spinner />
            ) : integration.isConnected ? (
              "Remove"
            ) : (
              "Add"
            )}
          </Button>
        </div>
      ))}
    </>
  );
};

export default IntegrationsList;
