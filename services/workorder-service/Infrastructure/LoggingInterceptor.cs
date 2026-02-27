using Grpc.Core;
using Grpc.Core.Interceptors;
using Serilog.Context;

namespace WorkOrderService.Infrastructure;

public class LoggingInterceptor : Interceptor
{
    private readonly ILogger<LoggingInterceptor> _logger;

    public LoggingInterceptor(ILogger<LoggingInterceptor> logger)
    {
        _logger = logger;
    }

    public override async Task<TResponse> UnaryServerHandler<TRequest, TResponse>(
        TRequest request,
        ServerCallContext context,
        UnaryServerMethod<TRequest, TResponse> continuation)
    {
        var correlationId = context.RequestHeaders.GetValue("x-correlation-id") ?? Guid.NewGuid().ToString();
        var method = context.Method.Split('/').LastOrDefault() ?? context.Method;

        using var _1 = LogContext.PushProperty("CorrelationId", correlationId);
        using var _2 = LogContext.PushProperty("Action", $"workorder.{char.ToLower(method[0])}{method[1..]}");

        _logger.LogInformation("gRPC {Method} called", method);

        try
        {
            var response = await continuation(request, context);
            _logger.LogInformation("gRPC {Method} completed", method);
            return response;
        }
        catch (RpcException ex)
        {
            if (ex.StatusCode == StatusCode.Internal)
                _logger.LogError(ex, "gRPC {Method} failed: {Message}", method, ex.Status.Detail);
            else
                _logger.LogWarning("gRPC {Method} failed with {StatusCode}: {Message}", method, ex.StatusCode, ex.Status.Detail);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "gRPC {Method} failed with unexpected error", method);
            throw;
        }
    }
}
